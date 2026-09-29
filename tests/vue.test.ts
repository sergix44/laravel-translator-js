import {createRenderer, defineComponent, h, inject, nextTick, ref, type App} from 'vue'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {getLocale, setLocale, trans} from '../src'
import {LaravelTranslatorVue, useTranslation, useTranslationChoice} from '../src/vue'

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

beforeEach(() => {
    setLocale('en', null)
})

afterEach(() => {
    setLocale('en', null)
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
            const title = useTranslation('Welcome!')
            const count = useTranslationChoice('{1} :count minute ago|[2,*] :count minutes ago', 1)
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
