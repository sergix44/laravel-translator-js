import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs'
import {createServer as createHttpServer} from 'node:http'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {effect, stop, type App} from 'vue'
import {expect, test, vi} from 'vitest'
import {createServer} from 'vite'
import {getTranslations, setTranslations} from '../src/catalogue'
import {onTranslationsChange, setLocale, trans} from '../src'
import laravelTranslator from '../src/vite'
import {LaravelTranslatorVue} from '../src/vue'

const getHook = (hook: unknown): Function =>
    typeof hook === 'function' ? hook : (hook as {handler: Function}).handler

const evaluateVirtualModule = (source: string, hot: object) => {
    const executable = source
        .replaceAll('import.meta.hot', 'hot')
        .replace('export const onTranslationsUpdate =', 'const onTranslationsUpdate =')
        .replace('export default translations', 'return {default: translations, onTranslationsUpdate}')

    return new Function('hot', executable)(hot) as {
        default: object
        onTranslationsUpdate: (listener: (next: object) => void) => () => void
    }
}

test('PHP and JSON edits update existing translations and Vue output without reloading the page', () => {
    const langPath = mkdtempSync(path.join(tmpdir(), 'laravel-translator-hmr-'))
    const phpFile = path.join(langPath, 'en', 'messages.php')
    const jsonFile = path.join(langPath, 'en.json')
    const originalTranslations = getTranslations()
    let stopEffect: (() => void) | undefined
    let unsubscribe: (() => void) | undefined
    let stopChangeListener: (() => void) | undefined

    try {
        mkdirSync(path.dirname(phpFile))
        writeFileSync(phpFile, '<?php return ["hello" => "Before PHP"];')
        writeFileSync(jsonFile, JSON.stringify({welcome: 'Before JSON'}))

        const plugin = laravelTranslator({langPath})
        const watch = vi.fn()
        getHook(plugin.configureServer).call({}, {watcher: {add: watch}})
        expect(watch).toHaveBeenCalledWith(expect.arrayContaining([langPath]))

        const virtualModule = {id: '\0virtual-laravel-translations'}
        const invalidateModule = vi.fn()
        const send = vi.fn()
        const server = {
            moduleGraph: {
                getModuleById: vi.fn(() => virtualModule),
                invalidateModule,
            },
            ws: {send},
        }
        const load = () => getHook(plugin.load).call({}, virtualModule.id) as string
        const hot = {data: {}, accept: vi.fn()}
        const initial = evaluateVirtualModule(load(), hot)
        unsubscribe = initial.onTranslationsUpdate(setTranslations)
        setTranslations(initial.default)
        setLocale('en', null)
        const translationChanges = vi.fn()
        stopChangeListener = onTranslationsChange(translationChanges)

        const app = {
            version: '3.5.0',
            config: {globalProperties: {}},
            provide: vi.fn(),
        } as unknown as App
        LaravelTranslatorVue.install(app, {locale: 'en'})
        const translateInVue = app.config.globalProperties.__
        let rendered = ''
        let renderCount = 0
        const runner = effect(() => {
            renderCount++
            rendered = `${translateInVue('messages.hello')}|${translateInVue('welcome')}`
        })
        stopEffect = () => stop(runner)

        expect(rendered).toBe('Before PHP|Before JSON')

        writeFileSync(phpFile, '<?php return ["hello" => "After PHP"];')
        const phpUpdate = getHook(plugin.handleHotUpdate).call({}, {
            file: phpFile, timestamp: 1, server,
        })
        expect(phpUpdate).toEqual([virtualModule])
        expect(invalidateModule).toHaveBeenCalledWith(virtualModule, expect.any(Set), 1, true)
        const acceptPhp = hot.accept.mock.calls.at(-1)![0]
        acceptPhp(evaluateVirtualModule(load(), hot))

        expect(trans('messages.hello')).toBe('After PHP')
        expect(rendered).toBe('After PHP|Before JSON')

        writeFileSync(jsonFile, JSON.stringify({welcome: 'After JSON'}))
        const jsonUpdate = getHook(plugin.handleHotUpdate).call({}, {
            file: jsonFile, timestamp: 2, server,
        })
        expect(jsonUpdate).toEqual([virtualModule])
        expect(invalidateModule).toHaveBeenCalledWith(virtualModule, expect.any(Set), 2, true)
        const acceptJson = hot.accept.mock.calls.at(-1)![0]
        acceptJson(evaluateVirtualModule(load(), hot))

        expect(trans('welcome')).toBe('After JSON')
        expect(rendered).toBe('After PHP|After JSON')
        expect(renderCount).toBe(3)
        expect(translationChanges).toHaveBeenCalledTimes(2)
        expect(send).not.toHaveBeenCalled()

        expect(getHook(plugin.handleHotUpdate).call({}, {
            file: path.join(langPath, 'en.txt'), timestamp: 3, server,
        })).toBeUndefined()
        expect(getHook(plugin.handleHotUpdate).call({}, {
            file: `${langPath}-other/en.json`, timestamp: 4, server,
        })).toBeUndefined()
        expect(send).not.toHaveBeenCalled()
    } finally {
        stopEffect?.()
        stopChangeListener?.()
        unsubscribe?.()
        setTranslations(originalTranslations)
        rmSync(langPath, {recursive: true, force: true})
    }
})

test('Vite sends module updates for changed PHP and JSON translations instead of a page reload', async () => {
    const langPath = mkdtempSync(path.join(tmpdir(), 'laravel-translator-vite-'))
    const phpFile = path.join(langPath, 'en', 'messages.php')
    const jsonFile = path.join(langPath, 'en.json')
    mkdirSync(path.dirname(phpFile))
    writeFileSync(phpFile, '<?php return ["hello" => "Before"];')
    writeFileSync(jsonFile, JSON.stringify({welcome: 'Before'}))

    const server = await createServer({
        configFile: false,
        root: langPath,
        plugins: [laravelTranslator({langPath})],
        server: {middlewareMode: true, hmr: {server: createHttpServer()}},
    })

    try {
        const transformed = await server.transformRequest('virtual-laravel-translations')
        expect(transformed?.code).toContain('import.meta.hot.accept(')

        const send = vi.spyOn(server.ws, 'send')
        writeFileSync(phpFile, '<?php return ["hello" => "After"];')

        await vi.waitFor(() => {
            expect(send.mock.calls.some(([payload]) =>
                typeof payload === 'object' && payload.type === 'update',
            )).toBe(true)
        }, {timeout: 3000})

        const updateCount = send.mock.calls.filter(([payload]) =>
            typeof payload === 'object' && payload.type === 'update',
        ).length
        writeFileSync(jsonFile, JSON.stringify({welcome: 'After'}))

        await vi.waitFor(() => {
            expect(send.mock.calls.filter(([payload]) =>
                typeof payload === 'object' && payload.type === 'update',
            ).length).toBeGreaterThan(updateCount)
        }, {timeout: 3000})

        expect(send.mock.calls.some(([payload]) =>
            typeof payload === 'object' && payload.type === 'full-reload',
        )).toBe(false)
    } finally {
        await server.close()
        rmSync(langPath, {recursive: true, force: true})
    }
})
