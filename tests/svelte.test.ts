// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen} from '@testing-library/svelte'
import {tick} from 'svelte'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import initialTranslations from 'virtual-laravel-translations'
import {getLocale, setLocale} from '../src'
import {setTranslations} from '../src/catalogue'
import {__, fallbackLocale, locale, localeState, trans_choice} from '../src/svelte'
import SvelteTranslations from './components/SvelteTranslations.svelte'
import SvelteScriptTranslations from './components/SvelteScriptTranslations.svelte'

beforeEach(async () => {
    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    setTranslations(initialTranslations)
    setLocale('en', null)
})

afterEach(async () => {
    cleanup()
    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    setLocale('en', null)
})

test('html locale attributes update mounted Svelte translations and stores', async () => {
    document.documentElement.lang = 'fr'
    document.documentElement.setAttribute('data-fallback-lang', 'en')
    await Promise.resolve()
    render(SvelteTranslations)

    expect(screen.getByTestId('title').textContent).toBe('Wecome!')

    document.documentElement.setAttribute('data-fallback-lang', 'pt')
    await Promise.resolve()
    await tick()
    expect(screen.getByTestId('title').textContent).toBe('Bem-vindo!')
    expect(getLocale()).toEqual({locale: 'fr', fallbackLocale: 'pt'})

    document.documentElement.lang = 'en'
    await Promise.resolve()
    await tick()
    expect(screen.getByTestId('title').textContent).toBe('Wecome!')
    expect((screen.getByTestId('select') as HTMLSelectElement).value).toBe('en')
    expect(getLocale()).toEqual({locale: 'en', fallbackLocale: 'pt'})

    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    await tick()
    expect(screen.getByTestId('title').textContent).toBe('Wecome!')
    expect(getLocale()).toEqual({locale: 'en', fallbackLocale: null})
})

test('locale changes update text, plural forms, attributes, and child props in a mounted component', async () => {
    render(SvelteTranslations)

    expect(screen.getByTestId('title').textContent).toBe('Wecome!')
    expect(screen.getByTestId('greeting').textContent).toBe('Welcome, John!')
    expect(screen.getByTestId('minutes').textContent).toBe('2 minutes ago')
    expect(screen.getByTestId('input').getAttribute('placeholder')).toBe('Wecome!')
    expect(screen.getByTestId('child').textContent).toBe('Wecome!')

    setLocale('pt')
    await tick()

    expect(screen.getByTestId('title').textContent).toBe('Bem-vindo!')
    expect(screen.getByTestId('greeting').textContent).toBe('Bem-vindo, John!')
    expect(screen.getByTestId('minutes').textContent).toBe('há 2 minutos')
    expect(screen.getByTestId('input').getAttribute('placeholder')).toBe('Bem-vindo!')
    expect(screen.getByTestId('child').textContent).toBe('Bem-vindo!')
    expect((screen.getByTestId('select') as HTMLSelectElement).value).toBe('pt')
})

test('translation catalogue updates change mounted text without changing locale', async () => {
    render(SvelteTranslations)
    const title = screen.getByTestId('title')

    setTranslations({en: {json: {'Welcome!': 'Updated live'}}})
    await tick()

    expect(screen.getByTestId('title')).toBe(title)
    expect(title.textContent).toBe('Updated live')
    expect(screen.getByTestId('input').getAttribute('placeholder')).toBe('Updated live')
    expect(screen.getByTestId('child').textContent).toBe('Updated live')
    expect(getLocale().locale).toBe('en')
})

test('Svelte script translations follow props, locale, and catalogue updates', async () => {
    const component = render(SvelteScriptTranslations, {name: 'John', count: 1})
    expect(screen.getByTestId('script-greeting').textContent).toBe('Welcome, John!')
    expect(screen.getByTestId('script-minutes').textContent).toBe('1 minute ago')

    await component.rerender({name: 'Jane', count: 2})
    expect(screen.getByTestId('script-greeting').textContent).toBe('Welcome, Jane!')
    expect(screen.getByTestId('script-minutes').textContent).toBe('2 minutes ago')

    setLocale('pt')
    await tick()
    expect(screen.getByTestId('script-greeting').textContent).toBe('Bem-vindo, Jane!')
    expect(screen.getByTestId('script-minutes').textContent).toBe('há 2 minutos')

    setTranslations({pt: {json: {
        'Welcome, :name!': 'Hello, :name!',
        '{1} :count minute ago|[2,*] :count minutes ago': '{1} One updated minute|[2,*] :count updated minutes',
    }}})
    await tick()
    expect(screen.getByTestId('script-greeting').textContent).toBe('Hello, Jane!')
    expect(screen.getByTestId('script-minutes').textContent).toBe('2 updated minutes')
    expect(screen.getByTestId('script-input').getAttribute('placeholder')).toBe('Hello, Jane!')
})

test('the bound locale select writes through to the core locale', async () => {
    render(SvelteTranslations)

    await fireEvent.change(screen.getByTestId('select'), {target: {value: 'pt'}})
    await tick()

    expect(getLocale().locale).toBe('pt')
    expect(screen.getByTestId('title').textContent).toBe('Bem-vindo!')
})

test('changing the fallback locale updates mounted translations', async () => {
    setTranslations({en: {json: {Shared: 'English fallback'}}, pt: {json: {Shared: 'Portuguese fallback'}}})
    setLocale('fr', null)
    render(SvelteTranslations)

    expect(screen.getByTestId('fallback').textContent).toBe('Shared')

    fallbackLocale.set('en')
    await tick()
    expect(screen.getByTestId('fallback').textContent).toBe('English fallback')

    fallbackLocale.set('pt')
    await tick()
    expect(screen.getByTestId('fallback').textContent).toBe('Portuguese fallback')
})

test('stores synchronously emit fresh functions and stop notifying after unsubscribe', () => {
    const seen: Array<(key: string) => string> = []
    const run = vi.fn((fn) => seen.push(fn))
    const stop = __.subscribe(run)
    const stopDuplicate = __.subscribe(run)

    expect(run).toHaveBeenCalledTimes(2)
    expect(seen[0]('Welcome!')).toBe('Wecome!')
    expect(seen[0]).toBe(seen[1])

    setLocale('pt')
    expect(run).toHaveBeenCalledTimes(4)
    expect(seen[2]).not.toBe(seen[0])
    expect(seen[2]).toBe(seen[3])
    expect(seen[2]('Welcome!')).toBe('Bem-vindo!')

    stop()
    stopDuplicate()
    setLocale('en')
    expect(run).toHaveBeenCalledTimes(4)
})

test('locale and fallback stores sync with core changes and preserve each other', () => {
    const locales: string[] = []
    const fallbacks: Array<string | null> = []
    const states: unknown[] = []
    const stopLocale = locale.subscribe((value) => locales.push(value))
    const stopFallback = fallbackLocale.subscribe((value) => fallbacks.push(value))
    const stopState = localeState.subscribe((value) => states.push(value))

    fallbackLocale.set('en')
    locale.set('pt-BR')

    expect(getLocale()).toEqual({locale: 'pt_BR', fallbackLocale: 'en'})
    expect(locales).toEqual(['en', 'pt_BR'])
    expect(fallbacks).toEqual([null, 'en'])
    expect(states).toEqual([
        {locale: 'en', fallbackLocale: null},
        {locale: 'en', fallbackLocale: 'en'},
        {locale: 'pt_BR', fallbackLocale: 'en'},
    ])

    setTranslations(structuredClone(initialTranslations))
    expect(locales).toHaveLength(2)
    expect(fallbacks).toHaveLength(2)

    stopLocale()
    stopFallback()
    stopState()
})

test('choice functions remain callable with an explicit locale', () => {
    let choice: Parameters<Parameters<typeof trans_choice.subscribe>[0]>[0]
    const stop = trans_choice.subscribe((value) => { choice = value })

    expect(choice('{1} :count minute ago|[2,*] :count minutes ago', 2, {}, 'pt')).toBe('há 2 minutos')
    stop()
})
