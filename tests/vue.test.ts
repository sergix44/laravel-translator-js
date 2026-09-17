import {effect, ref, stop} from 'vue'
import {beforeEach, expect, test, vi} from 'vitest'
import {setLocale} from '../src'
import {LaravelTranslatorVue} from '../src/vue'

beforeEach(() => {
    setLocale('en')
})

test('setLocale reactively updates translations rendered by the Vue plugin', () => {
    let unmount: (() => void) | undefined
    const app = {
        version: '3.5.43',
        provide: vi.fn(),
        config: {globalProperties: {}},
        onUnmount: vi.fn((callback: () => void) => {
            unmount = callback
        }),
    }

    LaravelTranslatorVue.install(app as never, {locale: 'en'})

    let renderedTranslation = ''
    const renderEffect = effect(() => {
        renderedTranslation = app.config.globalProperties['trans']('Welcome!')
    })

    expect(renderedTranslation).toBe('Wecome!')

    setLocale('pt')

    expect(renderedTranslation).toBe('Bem-vindo!')

    stop(renderEffect)
    unmount?.()
})

test('a reactive Vue locale updates the framework-agnostic locale store', () => {
    let unmount: (() => void) | undefined
    const app = {
        version: '3.5.43',
        provide: vi.fn(),
        config: {globalProperties: {}},
        onUnmount: vi.fn((callback: () => void) => {
            unmount = callback
        }),
    }
    const locale = ref('en')

    LaravelTranslatorVue.install(app as never, {locale})

    let renderedTranslation = ''
    const renderEffect = effect(() => {
        renderedTranslation = app.config.globalProperties['trans']('Welcome!')
    })

    locale.value = 'pt'

    expect(renderedTranslation).toBe('Bem-vindo!')

    stop(renderEffect)
    unmount?.()
})
