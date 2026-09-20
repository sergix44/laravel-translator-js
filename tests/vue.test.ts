import {effect, nextTick, ref, stop} from 'vue'
import {toDisplayString} from '@vue/shared'
import {beforeEach, expect, test} from 'vitest'
import {setLocale as setGlobalLocale, trans} from '../src'
import {setLocale, useLocale} from '../src/vue'

beforeEach(() => {
    setGlobalLocale('en', null)
})

test('a translation read inside a Vue effect re-runs when the locale changes', () => {
    let rendered = ''
    let renders = 0

    const renderEffect = effect(() => {
        renders++
        rendered = String(trans('Welcome!'))
    })

    expect(rendered).toBe('Wecome!')
    expect(renders).toBe(1)

    setGlobalLocale('pt')

    expect(rendered).toBe('Bem-vindo!')
    expect(renders).toBe(2)

    stop(renderEffect)
})

test('an unchanged locale does not re-run effects', () => {
    let renders = 0

    const renderEffect = effect(() => {
        renders++
        String(trans('Welcome!'))
    })

    expect(renders).toBe(1)

    setGlobalLocale('en')

    expect(renders).toBe(1)

    stop(renderEffect)
})

test('a stopped effect no longer reacts to locale changes', () => {
    let rendered = ''

    const renderEffect = effect(() => {
        rendered = String(trans('Welcome!'))
    })

    stop(renderEffect)
    setGlobalLocale('pt')

    expect(rendered).toBe('Wecome!')
})

test("Vue's template renderer prints the translation, not a JSON blob", () => {
    // This is what `{{ trans('Welcome!') }}` compiles down to. Vue only JSON-stringifies
    // objects whose toString is Object.prototype.toString, so the handle must pass through.
    expect(toDisplayString(trans('Welcome!'))).toBe('Wecome!')

    setGlobalLocale('pt')

    expect(toDisplayString(trans('Welcome!'))).toBe('Bem-vindo!')
})

test('setLocale drives the global locale from a Vue ref', () => {
    const locale = ref('en')
    const stopSync = setLocale(locale)

    let rendered = ''
    const renderEffect = effect(() => {
        rendered = String(trans('Welcome!'))
    })

    expect(rendered).toBe('Wecome!')

    locale.value = 'pt'

    expect(rendered).toBe('Bem-vindo!')

    stopSync()
    stop(renderEffect)
})

test('setLocale stops writing to the store once disposed', () => {
    const locale = ref('en')
    const stopSync = setLocale(locale)

    stopSync()
    locale.value = 'pt'

    expect(String(trans('Welcome!'))).toBe('Wecome!')
})

test('useLocale exposes the active locale as a computed', async () => {
    const state = useLocale()

    expect(state.value.locale).toBe('en')

    setGlobalLocale('pt-BR', 'en')
    await nextTick()

    expect(state.value).toEqual({locale: 'pt_BR', fallbackLocale: 'en'})
})
