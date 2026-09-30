import {beforeEach, expect, test} from "vitest";
import {setLocale, trans, trans_choice} from "../src";

beforeEach(() => {
    setLocale('en', null)
});

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

test('trans treats dotted JSON keys as literal strings', () => {
    expect(trans('Get started.', {}, 'pt')).toBe('Comece.')
    expect(trans('auth.arr.0', {}, 'de')).toBe('foo')
})

test('trans falls back for dotted JSON keys', () => {
    setLocale('fr', 'pt')

    expect(trans('Get started.')).toBe('Comece.')
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

test('trans return object for partial translation paths', async () => {
    const r = trans('domain.car.foo.level1') as Object

    expect(r).toEqual({level2: 'barpt'})
})

test('trans works with capitalization lowercase', async () => {
    const r = trans('auth.accepted_1', {'attribute': 'email'})

    expect(r).toBe('The email must be accepted.')
})

test('trans works with capitalization ucfirst', async () => {
    const r = trans('auth.accepted_2', {'attribute': 'email'})

    expect(r).toBe('The Email must be accepted.')
})

test('trans works with capitalization uppercase', async () => {
    const r = trans('auth.accepted_3', {'attribute': 'email'})

    expect(r).toBe('The EMAIL must be accepted.')
})

const lookupTranslations = {
    en: {
        php: {messages: {
            title: 'PHP title',
            group: {label: 'Nested PHP'},
            list: ['First', 'Second'],
            empty: '',
            stopped: null,
        }},
        json: {
            'messages.title': 'JSON title',
            'messages.empty': 'JSON after empty PHP',
            'messages.stopped.child': 'Literal after null PHP',
            'literal.key': 'Literal JSON',
            literal: {key: 'Nested JSON'},
            nested: {key: 'Nested JSON only', stopped: null},
            'empty.literal': '',
            empty: {literal: 'Nested value ignored'},
        },
    },
    es: {json: {Welcome: 'Bienvenido', 'empty.literal': 'Fallback value'}},
    php_only: {php: {messages: {title: 'Only PHP'}}},
    empty: {},
    null_locale: null,
}

test.each([
    {locale: 'en', key: 'messages.title', expected: 'PHP title'},
    {locale: 'en', key: 'literal.key', expected: 'Literal JSON'},
    {locale: 'en', key: 'nested.key', expected: 'Nested JSON only'},
    {locale: 'en', key: 'messages.group', expected: {label: 'Nested PHP'}},
    {locale: 'en', key: 'messages.list.1', expected: 'Second'},
    {locale: 'en', key: 'messages.empty', expected: 'JSON after empty PHP'},
    {locale: 'en', key: 'messages.stopped.child', expected: 'Literal after null PHP'},
    {locale: 'en', key: 'empty.literal', expected: ''},
    {locale: 'es', key: 'Welcome', expected: 'Bienvenido'},
    {locale: 'php_only', key: 'messages.title', expected: 'Only PHP'},
])('trans preserves lookup precedence for $locale:$key', ({locale, key, expected}) => {
    expect(trans(key, {}, null, {
        locale, fallbackLocale: null, translations: lookupTranslations,
    })).toEqual(expected)
})

test.each([
    {locale: 'en', key: 'messages.unknown.deep'},
    {locale: 'en', key: 'nested.stopped.child'},
    {locale: 'es', key: 'missing.deep.key'},
    {locale: 'php_only', key: 'missing.deep.key'},
    {locale: 'empty', key: 'missing.deep.key'},
    {locale: 'null_locale', key: 'missing.deep.key'},
    {locale: 'absent', key: 'missing.deep.key'},
])('trans returns the key for missing paths in $locale:$key', ({locale, key}) => {
    expect(trans(key, {}, null, {
        locale, fallbackLocale: null, translations: lookupTranslations,
    })).toBe(key)
})

test.each([
    {locale: 'absent', key: 'Welcome', fallbackLocale: 'es', expected: 'Bienvenido'},
    {locale: 'empty', key: 'messages.group.label', fallbackLocale: 'en', expected: 'Nested PHP'},
    {locale: 'en', key: 'empty.literal', fallbackLocale: 'es', expected: 'Fallback value'},
    {locale: 'en', key: 'missing.deep.key', fallbackLocale: 'absent', expected: 'missing.deep.key'},
])('trans preserves fallback resolution for $locale:$key', ({locale, key, fallbackLocale, expected}) => {
    expect(trans(key, {}, null, {
        locale, fallbackLocale, translations: lookupTranslations,
    })).toBe(expected)
})

test('an unreadable PHP branch still allows a literal JSON translation', () => {
    const translations = {en: {
        php: {get messages() { throw new Error('Unreadable branch') }},
        json: {'messages.title': 'JSON title'},
    }}

    expect(trans('messages.title', {}, null, {
        locale: 'en', fallbackLocale: null, translations,
    })).toBe('JSON title')
})
