import {beforeEach, expect, test, vi} from 'vitest'
import {setLocale, trans, trans_choice} from '../src'

beforeEach(() => {
    setLocale('en', null)
})

test('a handle coerces to a string everywhere JavaScript asks for one', () => {
    const msg = trans('auth.failed')
    const expected = 'These credentials do not match our records.'

    expect(String(msg)).toBe(expected)
    expect(`${msg}`).toBe(expected)
    expect(''.concat(msg as never)).toBe(expected)
    expect([msg, msg].join('|')).toBe(`${expected}|${expected}`)
    expect(msg.toString()).toBe(expected)
    expect(msg.valueOf()).toBe(expected)
})

test('a handle serializes to its value, not to a wrapper object', () => {
    expect(JSON.stringify({message: trans('auth.failed')}))
        .toBe('{"message":"These credentials do not match our records."}')
})

test('a handle re-reads the current locale instead of caching a dead string', () => {
    const msg = trans('Welcome!')

    expect(String(msg)).toBe('Wecome!')

    setLocale('pt')

    expect(String(msg)).toBe('Bem-vindo!')
})

test('a handle pinned to a locale ignores later locale changes', () => {
    const msg = trans('auth.failed', {}, 'fr')
    const expected = 'Ces identifiants ne correspondent pas à nos enregistrements.'

    expect(String(msg)).toBe(expected)

    setLocale('pt')

    expect(String(msg)).toBe(expected)
})

test('a subtree handle exposes the object and JSON-encodes when coerced', () => {
    const subtree = trans('domain.car.foo.level1')

    expect(subtree.value).toEqual({level2: 'barpt'})
    expect(String(subtree)).toBe('{"level2":"barpt"}')
})

test('subscribe fires immediately, then only when the value actually changes', () => {
    const run = vi.fn()
    const unsubscribe = trans('Welcome!').subscribe(run)

    // Immediate call is required by the Svelte store contract.
    expect(run).toHaveBeenCalledTimes(1)
    expect(run).toHaveBeenLastCalledWith('Wecome!')

    setLocale('pt')

    expect(run).toHaveBeenCalledTimes(2)
    expect(run).toHaveBeenLastCalledWith('Bem-vindo!')

    unsubscribe()
    setLocale('en')

    expect(run).toHaveBeenCalledTimes(2)
})

test('subscribe dedupes on the value, so an unchanged translation is not reported', () => {
    const run = vi.fn()

    // 'Start/end' differs between en and pt, 'Welcome, :name!' does not change for en->en.
    const unsubscribe = trans('Only Available on EN').subscribe(run)

    expect(run).toHaveBeenCalledTimes(1)

    // 'Only Available on EN' has no pt translation, so it falls back to the key itself in
    // both locales: the rendered value never changes and no update should be reported.
    setLocale('pt')

    expect(run).toHaveBeenCalledTimes(1)

    unsubscribe()
})

test('trans_choice returns a handle that pluralizes reactively', () => {
    const one = trans_choice('domain.car.car', 1)
    const many = trans_choice('domain.car.car', 2)

    expect(String(one)).toBe('Car')
    expect(String(many)).toBe('Cars')
})

test('a handle assigned to a DOM node renders its value', () => {
    const el = {textContent: ''} as { textContent: unknown }

    el.textContent = String(trans('auth.failed'))

    expect(el.textContent).toBe('These credentials do not match our records.')
})
