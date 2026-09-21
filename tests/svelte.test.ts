// @vitest-environment jsdom
import {cleanup, fireEvent, render, screen} from '@testing-library/svelte'
import {tick} from 'svelte'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import initialTranslations from 'virtual-laravel-translations'
import {getLocale, setLocale, setTranslations, trans} from '../src'
import {__, fallbackLocale, locale, localeState} from '../src/svelte'
import Title from './components/Title.svelte'
import HandleStore from './components/HandleStore.svelte'
import NoDollar from './components/NoDollar.svelte'
import SvelteAttrs from './components/SvelteAttrs.svelte'
import LocalePicker from './components/LocalePicker.svelte'
import SvelteParent from './components/SvelteParent.svelte'

beforeEach(() => {
    setTranslations(initialTranslations)
    setLocale('en', null)
})

afterEach(() => {
    cleanup()
})

test('a component using the $ store prefix re-renders on locale change', async () => {
    render(Title)

    expect(screen.getByTestId('title').textContent).toBe('Wecome!')
    expect(screen.getByTestId('greeting').textContent).toBe('Welcome, John!')
    expect(screen.getByTestId('cars').textContent).toBe('Cars')

    setLocale('pt')
    await tick()

    expect(screen.getByTestId('title').textContent).toBe('Bem-vindo!')
    expect(screen.getByTestId('greeting').textContent).toBe('Bem-vindo, John!')
})

test('a component updates when the catalogue changes without changing locale', async () => {
    render(Title)

    setTranslations({en: {json: {'Welcome!': 'Updated without a reload'}}})
    await tick()

    expect(screen.getByTestId('title').textContent).toBe('Updated without a reload')
    expect(getLocale().locale).toBe('en')
})

test('a handle is itself a store, usable with $ directly', async () => {
    render(HandleStore)

    expect(screen.getByTestId('title').textContent).toBe('Wecome!')

    setLocale('pt')
    await tick()

    expect(screen.getByTestId('title').textContent).toBe('Bem-vindo!')
})

test('an explicitly pinned handle ignores locale changes', async () => {
    render(HandleStore)

    expect(screen.getByTestId('pinned').textContent).toBe('Bem-vindo!')

    setLocale('en')
    await tick()

    expect(screen.getByTestId('pinned').textContent).toBe('Bem-vindo!')
})

test('omitting the $ prefix renders once and then goes stale', async () => {
    // Svelte only subscribes to a store when the $ prefix is used. Without it the handle
    // is merely coerced at render time, so the text is correct but frozen.
    render(NoDollar)

    expect(screen.getByTestId('title').textContent).toBe('Wecome!')

    setLocale('pt')
    await tick()

    expect(screen.getByTestId('title').textContent).toBe('Wecome!')
})

test('translations bound to attributes update', async () => {
    render(SvelteAttrs)

    expect(screen.getByTestId('input').getAttribute('placeholder')).toBe('Wecome!')
    expect(screen.getByTestId('img').getAttribute('alt')).toBe('Wecome!')

    setLocale('pt')
    await tick()

    expect(screen.getByTestId('input').getAttribute('placeholder')).toBe('Bem-vindo!')
    expect(screen.getByTestId('img').getAttribute('alt')).toBe('Bem-vindo!')
})

test('a translation passed as a component prop updates', async () => {
    render(SvelteParent)

    expect(screen.getByTestId('child').textContent).toBe('Wecome!')

    setLocale('pt')
    await tick()

    expect(screen.getByTestId('child').textContent).toBe('Bem-vindo!')
})

test('bind:value on the locale store reads and writes the locale', async () => {
    render(LocalePicker)

    const select = screen.getByTestId('select') as HTMLSelectElement
    expect(select.value).toBe('en')
    expect(screen.getByTestId('current').textContent).toBe('en')

    // store -> DOM
    setLocale('pt')
    await tick()
    expect(select.value).toBe('pt')

    // DOM -> store
    await fireEvent.change(select, {target: {value: 'en'}})
    expect(getLocale().locale).toBe('en')
})

test('the translate store emits a fresh function identity per change', () => {
    // Svelte 5 compares store values with ===, so re-emitting the same function
    // reference would not invalidate the template.
    const seen: unknown[] = []
    const unsubscribe = __.subscribe((fn) => seen.push(fn))

    expect(seen).toHaveLength(1)

    setLocale('pt')

    expect(seen).toHaveLength(2)
    expect(seen[0]).not.toBe(seen[1])

    unsubscribe()
})

test('translate store subscribers share one function instance per update', () => {
    const first: unknown[] = []
    const second: unknown[] = []
    const stopFirst = __.subscribe((fn) => first.push(fn))
    const stopSecond = __.subscribe((fn) => second.push(fn))

    expect(first[0]).toBe(second[0])

    setLocale('pt')

    expect(first[1]).toBe(second[1])
    expect(first[1]).not.toBe(first[0])

    stopFirst()
    stopSecond()
})

test('stores emit synchronously on subscribe, as SvelteKit SSR requires', () => {
    // SSR does subscribe -> read -> unsubscribe in one tick, with no chance to await.
    let value: string | undefined
    __.subscribe((fn) => {
        value = fn('Welcome!')
    })()

    expect(value).toBe('Wecome!')
})

test('a handle store unsubscribes cleanly', () => {
    const run = vi.fn()
    const unsubscribe = trans('Welcome!').subscribe(run)

    expect(run).toHaveBeenCalledTimes(1)

    unsubscribe()
    setLocale('pt')

    expect(run).toHaveBeenCalledTimes(1)
})

test('the locale store is a readable and writable string', () => {
    const seen: string[] = []
    const unsubscribe = locale.subscribe((value) => seen.push(value))

    expect(seen).toEqual(['en'])

    locale.set('pt-BR')

    expect(getLocale().locale).toBe('pt_BR')
    expect(seen).toEqual(['en', 'pt_BR'])

    unsubscribe()
})

test('locale stores do not emit for translation-only updates', () => {
    const seen: string[] = []
    const unsubscribe = locale.subscribe((value) => seen.push(value))

    setTranslations(structuredClone(initialTranslations))

    expect(seen).toEqual(['en'])
    unsubscribe()
})

test('the fallbackLocale store round-trips', () => {
    const seen: (string | null)[] = []
    const unsubscribe = fallbackLocale.subscribe((value) => seen.push(value))

    expect(seen).toEqual([null])

    fallbackLocale.set('en')

    expect(getLocale().fallbackLocale).toBe('en')
    expect(seen).toEqual([null, 'en'])

    unsubscribe()
})

test('localeState exposes both values at once', () => {
    const seen: unknown[] = []
    const unsubscribe = localeState.subscribe((state) => seen.push(state))

    setLocale('pt', 'en')

    expect(seen).toEqual([
        {locale: 'en', fallbackLocale: null},
        {locale: 'pt', fallbackLocale: 'en'},
    ])

    unsubscribe()
})
