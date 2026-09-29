// @vitest-environment jsdom
import {expect, test, vi} from 'vitest'

test('initializes both locales from optional html attributes', async () => {
    document.documentElement.lang = 'pt-BR'
    document.documentElement.setAttribute('data-fallback-lang', 'en-US')
    vi.resetModules()

    const {getLocale} = await import('../src/index')
    expect(getLocale()).toEqual({locale: 'pt_BR', fallbackLocale: 'en_US'})

    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    expect(getLocale()).toEqual({locale: 'en', fallbackLocale: null})
})
