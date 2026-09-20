// @vitest-environment jsdom
import {beforeEach, expect, test, vi} from 'vitest'
import {setLocale, trans} from '../src'
import {bind, disposeAll, effect} from '../src/vanilla'

beforeEach(() => {
    setLocale('en', null)
})

test('bind keeps an element in sync with a translation', () => {
    const el = document.createElement('h1')
    const dispose = bind(el, trans('Welcome!'))

    expect(el.textContent).toBe('Wecome!')

    setLocale('pt')

    expect(el.textContent).toBe('Bem-vindo!')

    dispose()
})

test('bind stops updating once disposed', () => {
    const el = document.createElement('h1')
    const dispose = bind(el, trans('Welcome!'))

    dispose()
    setLocale('pt')

    expect(el.textContent).toBe('Wecome!')
})

test('bind can target an attribute', () => {
    const input = document.createElement('input')
    const dispose = bind(input, trans('Welcome!'), {attr: 'placeholder'})

    expect(input.getAttribute('placeholder')).toBe('Wecome!')

    setLocale('pt')

    expect(input.getAttribute('placeholder')).toBe('Bem-vindo!')

    dispose()
})

test('bind can target a property', () => {
    const input = document.createElement('input') as HTMLInputElement
    const dispose = bind(input, trans('Welcome!'), {prop: 'value'})

    expect(input.value).toBe('Wecome!')

    setLocale('pt')

    expect(input.value).toBe('Bem-vindo!')

    dispose()
})

test('effect runs immediately and again on every locale change', () => {
    const run = vi.fn()
    const dispose = effect(run)

    expect(run).toHaveBeenCalledTimes(1)

    setLocale('pt')

    expect(run).toHaveBeenCalledTimes(2)

    dispose()
    setLocale('en')

    expect(run).toHaveBeenCalledTimes(2)
})

test('disposeAll tears down several bindings at once', () => {
    const a = document.createElement('p')
    const b = document.createElement('p')
    const dispose = disposeAll(bind(a, trans('Welcome!')), bind(b, trans('Welcome!')))

    expect(a.textContent).toBe('Wecome!')

    dispose()
    setLocale('pt')

    expect(a.textContent).toBe('Wecome!')
    expect(b.textContent).toBe('Wecome!')
})
