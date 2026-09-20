// @vitest-environment jsdom
import {mount} from '@vue/test-utils'
import {effect, nextTick, stop} from 'vue'
import {beforeEach, expect, test} from 'vitest'
import {setLocale, trans} from '../src'
import '../src/vue'
import SetupTitle from './components/SetupTitle.vue'
import EagerTitle from './components/EagerTitle.vue'
import ParentLabel from './components/ParentLabel.vue'

beforeEach(() => {
    setLocale('en', null)
})

test('a handle created in <script setup> stays reactive', async () => {
    const wrapper = mount(SetupTitle)

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Wecome!')
    expect(wrapper.get('[data-testid="greeting"]').text()).toBe('Welcome, John!')
    expect(wrapper.get('[data-testid="cars"]').text()).toBe('Cars')

    // setup() does not re-run, but the handle is lazy: the template re-reads it
    // inside the render effect, so the locale change still lands.
    setLocale('pt')
    await nextTick()

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Bem-vindo!')
    expect(wrapper.get('[data-testid="greeting"]').text()).toBe('Bem-vindo, John!')

    wrapper.unmount()
})

test('attribute bindings update when the bound value changes identity', async () => {
    const wrapper = mount(SetupTitle)
    const placeholder = (id: string) => wrapper.get(`[data-testid="${id}"]`).attributes('placeholder')

    expect(placeholder('by-value')).toBe('Wecome!')
    expect(placeholder('by-inline')).toBe('Wecome!')
    expect(placeholder('by-string')).toBe('Wecome!')

    setLocale('pt')
    await nextTick()

    expect(placeholder('by-value')).toBe('Bem-vindo!')
    expect(placeholder('by-inline')).toBe('Bem-vindo!')
    expect(placeholder('by-string')).toBe('Bem-vindo!')

    wrapper.unmount()
})

test('binding a hoisted handle straight to an attribute does not update', async () => {
    // Vue diffs props by reference. A handle hoisted into setup is the same object on
    // every render, so Vue concludes the prop is unchanged and skips the DOM patch.
    // Text interpolation is unaffected because it re-reads the handle each render.
    const wrapper = mount(SetupTitle)

    expect(wrapper.get('[data-testid="by-handle"]').attributes('placeholder')).toBe('Wecome!')

    setLocale('pt')
    await nextTick()

    expect(wrapper.get('[data-testid="by-handle"]').attributes('placeholder')).toBe('Wecome!')
    // ...while the interpolated text in the same component did update:
    expect(wrapper.get('[data-testid="title"]').text()).toBe('Bem-vindo!')

    wrapper.unmount()
})

test('reading .value in <script setup> snapshots the string and does not track', async () => {
    // Documents the one way to lose reactivity: coercing during setup, which runs once
    // and outside any render effect.
    const wrapper = mount(EagerTitle)

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Wecome!')

    setLocale('pt')
    await nextTick()

    expect(wrapper.get('[data-testid="title"]').text()).toBe('Wecome!')

    wrapper.unmount()
})

test('a handle read outside an effect first is still tracked when later rendered', () => {
    // Regression guard: the memo is keyed on a version counter, so it would be tempting to
    // skip the tracking call on a cache hit. Warming the cache here, outside any effect,
    // then rendering must still register the dependency.
    const handle = trans('Welcome!')

    expect(String(handle)).toBe('Wecome!') // warms the memo outside any effect

    let rendered = ''
    const renderEffect = effect(() => {
        rendered = String(handle)
    })

    expect(rendered).toBe('Wecome!')

    setLocale('pt')

    expect(rendered).toBe('Bem-vindo!')

    stop(renderEffect)
})

test('a component unmounted before the locale changes does not keep rendering', async () => {
    const wrapper = mount(SetupTitle)
    wrapper.unmount()

    setLocale('pt')
    await nextTick()

    expect(wrapper.html()).not.toContain('Bem-vindo!')
})

test('a handle passed as a prop stays reactive in the child', async () => {
    // The prop reference never changes, but the child interpolates it, so the child's own
    // render effect tracks the locale and re-renders. This is the prop case working.
    const wrapper = mount(ParentLabel)

    expect(wrapper.get('[data-testid="child"]').text()).toBe('Wecome!')

    setLocale('pt')
    await nextTick()

    expect(wrapper.get('[data-testid="child"]').text()).toBe('Bem-vindo!')

    wrapper.unmount()
})
