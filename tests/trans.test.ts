import {beforeEach, expect, test, vi} from "vitest";
import {getLocale, onLocaleChange, setLocale, trans, trans_choice} from "../src";

beforeEach(() => {
    setLocale('en', null)
});

test('trans works with random key', async () => {
    const r = trans('random.key').value

    expect(r).toBe('random.key')
})

test('trans works with a key that exists', async () => {
    const r = trans('auth.failed').value

    expect(r).toBe('These credentials do not match our records.')
})

test('trans works with a key that exists nested', async () => {
    const r = trans('domain.car.is_electric').value

    expect(r).toBe('Electric')
})

test('trans works with parameters', async () => {
    const r = trans('Welcome, :name!', {name: 'John'}).value

    expect(r).toBe('Welcome, John!')
})

test('trans works specifying locale', async () => {
    const r = trans('Welcome, :name!', {name: 'John'}, 'pt').value

    expect(r).toBe('Bem-vindo, John!')
})

test('trans choice works with solo', async () => {
    const r = trans_choice('domain.car.car', 1).value

    expect(r).toBe('Car')
})

test('trans choice works with multi', async () => {
    const r = trans_choice('domain.car.car', 2).value

    expect(r).toBe('Cars')
})

test('setLocale works', async () => {
    setLocale('pt')

    expect(trans('Welcome, :name!', {name: 'John'}).value).toBe('Bem-vindo, John!')
    expect(trans('nested.cars.car.is_electric').value).toBe('É elétrico?')
})

test('setLocale with fallback works', async () => {
    setLocale('fr', 'pt')

    expect(trans('auth.failed').value).toBe('Ces identifiants ne correspondent pas à nos enregistrements.')
    expect(trans('nested.cars.car.is_electric').value).toBe('É elétrico?')
})

test('setLocale notifies framework-agnostic subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = onLocaleChange(listener)

    setLocale('pt-BR', 'en-US')

    expect(getLocale()).toEqual({locale: 'pt_BR', fallbackLocale: 'en_US'})
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({locale: 'pt_BR', fallbackLocale: 'en_US'})

    unsubscribe()
    setLocale('en')

    expect(listener).toHaveBeenCalledOnce()
})

test('specifying locale works', async () => {
    expect(trans('auth.failed', {}, 'fr').value).toBe('Ces identifiants ne correspondent pas à nos enregistrements.')
    expect(trans('auth.failed', {}, 'en').value).toBe('These credentials do not match our records.')
    expect(trans('auth.failed', {}, 'pt').value).toBe('As credenciais indicadas não coincidem com as registadas no sistema.')
})

test('trans return object for partial translation paths', async () => {
    const r = trans('domain.car.foo.level1').value

    expect(r).toEqual({level2: 'barpt'})
})

test('trans works with capitalization lowercase', async () => {
    const r = trans('auth.accepted_1', {'attribute': 'email'}).value

    expect(r).toBe('The email must be accepted.')
})

test('trans works with capitalization ucfirst', async () => {
    const r = trans('auth.accepted_2', {'attribute': 'email'}).value

    expect(r).toBe('The Email must be accepted.')
})

test('trans works with capitalization uppercase', async () => {
    const r = trans('auth.accepted_3', {'attribute': 'email'}).value

    expect(r).toBe('The EMAIL must be accepted.')
})
