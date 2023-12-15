import {expect, test} from "vitest";
import {setLocale, trans, trans_choice} from "../src";

test('trans works with random key', async () => {
    const r = trans('random.key')

    expect(r).toBe('random.key')
})

test('trans works with a key that exists', async () => {
    const r = trans('auth.failed')

    expect(r).toBe('These credentials do not match our records.')
})

test('trans works with a key that exists nested', async () => {
    const r = trans('domain.car.is_electric')

    expect(r).toBe('Electric')
})

test('trans works with parameters', async () => {
    const r = trans('Welcome, :name!', {name: 'John'})

    expect(r).toBe('Welcome, John!')
})

test('trans works specifying locale', async () => {
    const r = trans('Welcome, :name!', {name: 'John'}, 'pt')

    expect(r).toBe('Bem-vindo, John!')
})

test('trans choice works with solo', async () => {
    const r = trans_choice('domain.car.car', 1)

    expect(r).toBe('Car')
})

test('trans choice works with multi', async () => {
    const r = trans_choice('domain.car.car', 2)

    expect(r).toBe('Cars')
})

test('setLocale works', async () => {
    setLocale('pt')

    expect(trans('Welcome, :name!', {name: 'John'})).toBe('Bem-vindo, John!')
    expect(trans('nested.cars.car.is_electric')).toBe('É elétrico?')
})

test('setLocale with fallback works', async () => {
    setLocale('fr', 'pt')

    expect(trans('auth.failed')).toBe('Ces identifiants ne correspondent pas à nos enregistrements.')
    expect(trans('nested.cars.car.is_electric')).toBe('É elétrico?')
})

test('specifying locale works', async () => {
    expect(trans('auth.failed', {}, 'fr')).toBe('Ces identifiants ne correspondent pas à nos enregistrements.')
    expect(trans('auth.failed', {}, 'en')).toBe('These credentials do not match our records.')
    expect(trans('auth.failed', {}, 'pt')).toBe('As credenciais indicadas não coincidem com as registadas no sistema.')
})