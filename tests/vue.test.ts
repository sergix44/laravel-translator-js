// @vitest-environment jsdom
import {createRenderer, defineComponent, h, inject, nextTick, ref, type App} from 'vue'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {getLocale, setLocale, trans} from '../src'
import {getTranslations, setTranslations} from '../src/catalogue'
import {__, t, trans as vueTrans, trans_choice, transChoice, LaravelTranslatorVue, useTranslation, useTranslationChoice} from '../src/vue'

interface HostNode {
    type: string
    text: string
    children: HostNode[]
    parent: HostNode | null
}

const createNode = (type: string, text = ''): HostNode => ({type, text, children: [], parent: null})

const renderer = createRenderer<HostNode, HostNode>({
    createElement: (type) => createNode(type),
    createText: (text) => createNode('#text', text),
    createComment: (text) => createNode('#comment', text),
    setText: (node, text) => { node.text = text },
    setElementText: (node, text) => { node.text = text; node.children = [] },
    patchProp: () => {},
    insert: (node, parent, anchor) => {
        if (node.parent) {
            const oldIndex = node.parent.children.indexOf(node)
            if (oldIndex !== -1) node.parent.children.splice(oldIndex, 1)
        }
        node.parent = parent
        const index = anchor ? parent.children.indexOf(anchor) : -1
        if (index === -1) parent.children.push(node)
        else parent.children.splice(index, 0, node)
    },
    remove: (node) => {
        const index = node.parent?.children.indexOf(node) ?? -1
        if (index !== -1) node.parent!.children.splice(index, 1)
        node.parent = null
    },
    parentNode: (node) => node.parent,
    nextSibling: (node) => {
        const siblings = node.parent?.children ?? []
        return siblings[siblings.indexOf(node) + 1] ?? null
    },
})

const renderedText = (node: HostNode): string =>
    node.text + node.children.map(renderedText).join('')

beforeEach(async () => {
    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    setLocale('en', null)
})

afterEach(async () => {
    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    setLocale('en', null)
})

test('Vue uses and follows the html locale attributes without plugin options', async () => {
    document.documentElement.lang = 'fr'
    document.documentElement.setAttribute('data-fallback-lang', 'en')
    await Promise.resolve()

    const Root = defineComponent({
        render() {
            return h('p', this.__('Welcome!'))
        },
    })
    const container = createNode('root')
    const app = renderer.createApp(Root)
    app.use(LaravelTranslatorVue)
    app.mount(container)

    try {
        expect(renderedText(container)).toBe('Wecome!')

        document.documentElement.setAttribute('data-fallback-lang', 'pt')
        await Promise.resolve()
        await nextTick()
        expect(renderedText(container)).toBe('Bem-vindo!')
        expect(getLocale()).toEqual({locale: 'fr', fallbackLocale: 'pt'})

        document.documentElement.lang = 'en'
        await Promise.resolve()
        await nextTick()
        expect(renderedText(container)).toBe('Wecome!')
        expect(getLocale()).toEqual({locale: 'en', fallbackLocale: 'pt'})

        document.documentElement.removeAttribute('data-fallback-lang')
        await Promise.resolve()
        await nextTick()
        expect(renderedText(container)).toBe('Wecome!')
        expect(getLocale()).toEqual({locale: 'en', fallbackLocale: null})
    } finally {
        app.unmount()
    }
})

test('every Vue component updates after setLocale, including injected and direct translator calls', async () => {
    const renders = {global: 0, composable: 0, direct: 0}
    const GlobalHelper = defineComponent({
        render() {
            renders.global++
            return h('p', this.__('Welcome!'))
        },
    })
    const Composable = defineComponent({
        setup() {
            const title = vueTrans('Welcome!')
            const count = trans_choice('{1} :count minute ago|[2,*] :count minutes ago', 1)
            return () => {
                renders.composable++
                return h('p', `${title.value} / ${count.value}`)
            }
        },
    })
    const DirectImport = defineComponent({
        setup() {
            const injected = inject<typeof trans>('trans')!
            return () => {
                renders.direct++
                return h('p', `${injected('Welcome!')} / ${trans('Welcome, :name!', {name: 'John'})}`)
            }
        },
    })
    const Root = defineComponent({
        render: () => h('div', [h(GlobalHelper), h(Composable), h(DirectImport)]),
    })

    const container = createNode('root')
    const locale = ref('en')
    const app = renderer.createApp(Root)
    app.use(LaravelTranslatorVue, {locale})
    app.mount(container)

    try {
        expect(renderedText(container)).toContain('Wecome!')
        expect(renderedText(container)).toContain('Welcome, John!')
        expect(renders).toEqual({global: 1, composable: 1, direct: 1})

        setLocale('pt')
        await nextTick()

        expect(renderedText(container)).toContain('Bem-vindo!')
        expect(renderedText(container)).toContain('Bem-vindo, John!')
        expect(renderedText(container)).not.toContain('Wecome!')
        expect(renders).toEqual({global: 2, composable: 2, direct: 2})
        expect(locale.value).toBe('pt')

        setLocale('pt')
        await nextTick()
        expect(renders).toEqual({global: 2, composable: 2, direct: 2})

        locale.value = 'en'
        await nextTick()
        expect(renderedText(container)).toContain('Wecome!')
        expect(renderedText(container)).toContain('Welcome, John!')
        expect(renders).toEqual({global: 3, composable: 3, direct: 3})
    } finally {
        app.unmount()
    }
})

test('Vue translations follow refs and getters for keys, replacements, counts, and explicit locales', () => {
    const key = ref('Welcome, :name!')
    const name = ref('John')
    const count = ref(1)
    const replacements = ref({name: 'John'})
    const explicitLocale = ref<string | undefined>('pt')
    const greeting = vueTrans(key, () => ({name: name.value}))
    const minutesKey = '{1} :count minute ago|[2,*] :count minutes ago'
    const minutes = trans_choice(() => minutesKey, count)
    const explicitGreeting = vueTrans(() => key.value, replacements, explicitLocale)
    const explicitMinutes = trans_choice(minutesKey, () => count.value, {}, () => explicitLocale.value)

    expect(greeting.value).toBe('Welcome, John!')
    expect(minutes.value).toBe('1 minute ago')
    expect(explicitGreeting.value).toBe('Bem-vindo, John!')
    expect(explicitMinutes.value).toBe('há 1 minuto')

    name.value = 'Jane'
    replacements.value = {name: 'Jane'}
    count.value = 2

    expect(greeting.value).toBe('Welcome, Jane!')
    expect(minutes.value).toBe('2 minutes ago')
    expect(explicitGreeting.value).toBe('Bem-vindo, Jane!')
    expect(explicitMinutes.value).toBe('há 2 minutos')

    setLocale('pt')
    expect(greeting.value).toBe('Bem-vindo, Jane!')
    expect(minutes.value).toBe('há 2 minutos')

    explicitLocale.value = 'en'
    expect(explicitGreeting.value).toBe('Welcome, Jane!')
    expect(explicitMinutes.value).toBe('2 minutes ago')

    key.value = 'Welcome!'
    expect(greeting.value).toBe('Bem-vindo!')
    expect(explicitGreeting.value).toBe('Wecome!')

    explicitLocale.value = undefined
    expect(explicitGreeting.value).toBe('Bem-vindo!')
    expect(explicitMinutes.value).toBe('há 2 minutos')
})

test('Vue named helpers and compatibility aliases follow locale and catalogue changes', () => {
    const originalTranslations = getTranslations()

    try {
        setTranslations({
            en: {json: {Welcome: 'English', Items: '{1} One item|[2,*] :count items'}},
            pt: {json: {Welcome: 'Portuguese', Items: '{1} Um item|[2,*] :count itens'}},
        })
        const titles = [vueTrans, __, t, useTranslation].map((translate) => translate('Welcome'))
        const counts = [trans_choice, transChoice, useTranslationChoice].map((translate) => translate('Items', 2))

        expect(titles.map((title) => title.value)).toEqual(Array(4).fill('English'))
        expect(counts.map((count) => count.value)).toEqual(Array(3).fill('2 items'))

        setLocale('pt')
        expect(titles.map((title) => title.value)).toEqual(Array(4).fill('Portuguese'))
        expect(counts.map((count) => count.value)).toEqual(Array(3).fill('2 itens'))

        setTranslations({pt: {json: {Welcome: 'Updated', Items: '{1} Single|[2,*] :count updated'}}})
        expect(titles.map((title) => title.value)).toEqual(Array(4).fill('Updated'))
        expect(counts.map((count) => count.value)).toEqual(Array(3).fill('2 updated'))
    } finally {
        setTranslations(originalTranslations)
    }
})

test('writable locale and fallback refs stay in sync with the global translator', () => {
    const locale = ref('fr')
    const fallbackLocale = ref<string | null>('en')
    let cleanup = () => {}
    const app = {
        config: {globalProperties: {}},
        provide: vi.fn(),
        onUnmount: (callback: () => void) => { cleanup = callback },
    } as unknown as App

    LaravelTranslatorVue.install(app, {locale, fallbackLocale})
    const title = useTranslation('Welcome!')

    expect(title.value).toBe('Wecome!')
    fallbackLocale.value = 'pt'
    expect(title.value).toBe('Bem-vindo!')
    expect(getLocale()).toEqual({locale: 'fr', fallbackLocale: 'pt'})

    setLocale('pt-BR', 'en')
    expect(locale.value).toBe('pt_BR')
    expect(fallbackLocale.value).toBe('en')

    cleanup()
    locale.value = 'fr'
    expect(getLocale().locale).toBe('pt_BR')
})
