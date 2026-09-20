// @vitest-environment jsdom
import {mount} from '@vue/test-utils'
import {computed, effect, nextTick, stop} from 'vue'
import {beforeEach, expect, test} from 'vitest'
import {setLocale} from '../src'
import {__, trans, trans_choice, transChoice} from '../src/vue'
import StringTrans from './components/StringTrans.vue'

beforeEach(() => {
    setLocale('en', null)
})

test('the Vue adapter returns a real string', () => {
    expect(typeof trans('Welcome!')).toBe('string')
    expect(trans('Welcome!')).toBe('Wecome!')
    expect(typeof transChoice('domain.car.car', 2)).toBe('string')
})

test('a string translation is still reactive inside an effect', () => {
    let rendered = ''
    let renders = 0

    const renderEffect = effect(() => {
        renders++
        rendered = trans('Welcome!')
    })

    expect(rendered).toBe('Wecome!')
    expect(renders).toBe(1)

    setLocale('pt')

    expect(rendered).toBe('Bem-vindo!')
    expect(renders).toBe(2)

    stop(renderEffect)
})

test('a string translation passed to a prop typed as string updates', async () => {
    // The exact case that failed to type-check when trans() returned a handle:
    // <TypedProp :title="__('Welcome!')" /> where TypedProp declares title: string.
    const wrapper = mount(StringTrans)

    expect(wrapper.get('[data-testid="typed"]').text()).toBe('Wecome!')

    setLocale('pt')
    await nextTick()

    expect(wrapper.get('[data-testid="typed"]').text()).toBe('Bem-vindo!')

    wrapper.unmount()
})

test('attribute bindings update without reaching for .value', async () => {
    // Strings compare by value, so Vue's prop diff sees a change and patches the DOM.
    // This is the trap that a hoisted handle falls into.
    const wrapper = mount(StringTrans)

    expect(wrapper.get('[data-testid="input"]').attributes('placeholder')).toBe('Wecome!')

    setLocale('pt')
    await nextTick()

    expect(wrapper.get('[data-testid="input"]').attributes('placeholder')).toBe('Bem-vindo!')

    wrapper.unmount()
})

test('interpolation and pluralization render through the adapter', async () => {
    const wrapper = mount(StringTrans)

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Wecome!')
    expect(wrapper.get('[data-testid="cars"]').text()).toBe('Cars')

    setLocale('pt')
    await nextTick()

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Bem-vindo!')

    wrapper.unmount()
})

test('wrapping in computed keeps a hoisted translation live', () => {
    // The documented escape hatch for translations held outside the template.
    const title = computed(() => __('Welcome!'))

    expect(title.value).toBe('Wecome!')

    setLocale('pt')

    expect(title.value).toBe('Bem-vindo!')
})

test('a translation hoisted out of any reactive context is a dead string', () => {
    // Pinned so the limitation is known: this is the one case that needs computed().
    const title = __('Welcome!')

    setLocale('pt')

    expect(title).toBe('Wecome!')
})

test('an explicit locale pins the string', () => {
    expect(__('Welcome!', {}, 'pt')).toBe('Bem-vindo!')

    setLocale('pt')

    expect(__('Welcome!', {}, 'en')).toBe('Wecome!')
})
