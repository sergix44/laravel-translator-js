// @vitest-environment jsdom
import {render, screen, cleanup} from '@testing-library/svelte'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {setLocale} from '../src'
import {__, locale} from '../src/svelte'
import Title from './components/Title.svelte'

beforeEach(() => {
    setLocale('en', null)
})

afterEach(() => {
    cleanup()
})

test('a real Svelte component re-renders when the locale changes', async () => {
    render(Title)

    expect(screen.getByTestId('title').textContent).toBe('Wecome!')
    expect(screen.getByTestId('greeting').textContent).toBe('Welcome, John!')
    expect(screen.getByTestId('cars').textContent).toBe('Cars')

    setLocale('pt')
    await Promise.resolve()

    expect(screen.getByTestId('title').textContent).toBe('Bem-vindo!')
    expect(screen.getByTestId('greeting').textContent).toBe('Bem-vindo, John!')
})

test('the translate store emits a fresh function identity per change', () => {
    // Svelte 5 compares store values with ===, so re-emitting the same reference would
    // not invalidate the template.
    const seen: unknown[] = []
    const unsubscribe = __.subscribe((fn) => seen.push(fn))

    expect(seen).toHaveLength(1)

    setLocale('pt')

    expect(seen).toHaveLength(2)
    expect(seen[0]).not.toBe(seen[1])

    unsubscribe()
})

test('the translate store unsubscribes cleanly', () => {
    const run = vi.fn()
    const unsubscribe = __.subscribe(run)

    expect(run).toHaveBeenCalledTimes(1)

    unsubscribe()
    setLocale('pt')

    expect(run).toHaveBeenCalledTimes(1)
})

test('the locale store is readable and writable', () => {
    const seen: string[] = []
    const unsubscribe = locale.subscribe((state) => seen.push(state.locale))

    expect(seen).toEqual(['en'])

    locale.set('pt-BR')

    expect(seen).toEqual(['en', 'pt_BR'])

    unsubscribe()
})
