import path from 'path'
import {describe, expect, test, vi} from 'vitest'
import laravelTranslator from '../src/vite'

const getHook = (hook: unknown) => {
    if (typeof hook === 'function') {
        return hook
    }

    return (hook as {handler: Function}).handler
}

describe('Vite plugin', () => {
    test('the virtual module accepts hot updates and publishes the new catalogue', () => {
        const plugin = laravelTranslator({langPath: 'tests/fixtures/lang'})
        const source = getHook(plugin.load).call({}, '\0virtual-laravel-translations')

        expect(source).toContain('export const onTranslationsUpdate')
        expect(source).toContain('import.meta.hot.accept(')
        expect(source).toContain('listener(nextModule.default)')
    })

    test('watches all configured translation paths', () => {
        const plugin = laravelTranslator({
            langPath: 'tests/fixtures/lang',
            additionalLangPaths: ['tests/fixtures/locales'],
        })
        const add = vi.fn()

        getHook(plugin.configureServer).call({}, {watcher: {add}})

        expect(add).toHaveBeenCalledWith([
            path.resolve('vendor/laravel/framework/src/Illuminate/Translation/lang'),
            path.resolve('tests/fixtures/lang'),
            path.resolve('tests/fixtures/locales'),
        ])
    })

    test('invalidates the virtual module when a PHP translation changes', () => {
        const plugin = laravelTranslator({langPath: 'tests/fixtures/lang'})
        const virtualModule = {id: '\0virtual-laravel-translations'}
        const invalidateModule = vi.fn()
        const send = vi.fn()
        const context = {
            file: path.resolve('tests/fixtures/lang/en/auth.php'),
            timestamp: 123,
            server: {
                moduleGraph: {
                    getModuleById: vi.fn(() => virtualModule),
                    invalidateModule,
                },
                ws: {send},
            },
        }

        const modules = getHook(plugin.handleHotUpdate).call({}, context)

        expect(modules).toEqual([virtualModule])
        expect(invalidateModule).toHaveBeenCalledWith(virtualModule, expect.any(Set), 123, true)
        expect(send).not.toHaveBeenCalled()
    })

    test('ignores changes outside configured translation paths', () => {
        const plugin = laravelTranslator({langPath: 'tests/fixtures/lang'})
        const getModuleById = vi.fn()
        const context = {
            file: path.resolve('tests/fixtures/locales/en/auth.php'),
            timestamp: 123,
            server: {
                moduleGraph: {getModuleById},
            },
        }

        const modules = getHook(plugin.handleHotUpdate).call({}, context)

        expect(modules).toBeUndefined()
        expect(getModuleById).not.toHaveBeenCalled()
    })
})
