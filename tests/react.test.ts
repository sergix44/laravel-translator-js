// @vitest-environment jsdom
import {act, createElement as h, memo, StrictMode, useLayoutEffect, useMemo, type ReactNode} from 'react'
import {createRoot, hydrateRoot, type Root} from 'react-dom/client'
import {renderToString} from 'react-dom/server'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import initialTranslations from 'virtual-laravel-translations'
import * as core from '../src'
import * as catalogue from '../src/catalogue'
import {use_trans as useTrans, use_trans_choice as useTransChoice, ___ as useShortTranslation, useTranslation, useTranslationChoice, useTranslator, type ReactTranslator, type TranslateFn} from '../src/react'

let root: Root | undefined
let container: HTMLDivElement

beforeEach(async () => {
    ;(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT: boolean}).IS_REACT_ACT_ENVIRONMENT = true
    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    catalogue.setTranslations(initialTranslations)
    core.setLocale('en', null)
    container = document.createElement('div')
    document.body.append(container)
})

afterEach(async () => {
    if (root) await act(() => root!.unmount())
    root = undefined
    container.remove()
    vi.restoreAllMocks()
    document.documentElement.removeAttribute('lang')
    document.documentElement.removeAttribute('data-fallback-lang')
    await Promise.resolve()
    catalogue.setTranslations(initialTranslations)
    core.setLocale('en', null)
    delete (globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT
})

const mount = async (children: ReactNode) => {
    root = createRoot(container)
    await act(() => root!.render(children))
}

const element = (id: string): HTMLElement => container.querySelector(`[data-testid="${id}"]`)!
const text = (id: string) => element(id).textContent
const minutesKey = '{1} :count minute ago|[2,*] :count minutes ago'

const MemoizedChild = memo(({translate}: {translate: TranslateFn}) => {
    const title = useMemo(() => translate('Welcome!'), [translate])
    return h('p', {'data-testid': 'child'}, title)
})

const Translations = () => {
    const {trans, trans_choice, locale, fallbackLocale, setLocale} = useTranslator()
    return h('div', null,
        h('h1', {'data-testid': 'title'}, trans('Welcome!')),
        h('p', {'data-testid': 'greeting'}, trans('Welcome, :name!', {name: 'John'})),
        h('p', {'data-testid': 'minutes'}, trans_choice(minutesKey, 2)),
        h('p', {'data-testid': 'php'}, trans('messages.hello')),
        h('input', {'data-testid': 'input', placeholder: trans('Welcome!')}),
        h(MemoizedChild, {translate: trans}),
        h('output', {'data-testid': 'state'}, `${locale}|${fallbackLocale ?? ''}`),
        h('select', {
            'data-testid': 'select', value: locale,
            onChange: (event) => setLocale(event.target.value, fallbackLocale),
        }, h('option', {value: 'en'}, 'English'), h('option', {value: 'pt'}, 'Portuguese')),
    )
}

test('html locale attributes update mounted React translations without a provider', async () => {
    document.documentElement.lang = 'fr'
    document.documentElement.setAttribute('data-fallback-lang', 'en')
    await Promise.resolve()
    await mount(h(Translations))
    expect(text('title')).toBe('Wecome!')
    expect(text('state')).toBe('fr|en')

    await act(async () => {
        document.documentElement.setAttribute('data-fallback-lang', 'pt')
        await Promise.resolve()
    })
    expect(text('title')).toBe('Bem-vindo!')
    expect(text('state')).toBe('fr|pt')

    await act(async () => {
        document.documentElement.lang = 'en'
        await Promise.resolve()
    })
    expect(text('title')).toBe('Wecome!')
    expect(text('state')).toBe('en|pt')

    await act(async () => {
        document.documentElement.removeAttribute('data-fallback-lang')
        await Promise.resolve()
    })
    expect(text('state')).toBe('en|')
})

test('setLocale updates text, plurals, attributes, and memoized children', async () => {
    await mount(h(Translations))
    expect(text('title')).toBe('Wecome!')
    expect(text('greeting')).toBe('Welcome, John!')
    expect(text('minutes')).toBe('2 minutes ago')
    expect(text('child')).toBe('Wecome!')

    await act(() => core.setLocale('pt'))

    expect(text('title')).toBe('Bem-vindo!')
    expect(text('greeting')).toBe('Bem-vindo, John!')
    expect(text('minutes')).toBe('há 2 minutos')
    expect(element('input').getAttribute('placeholder')).toBe('Bem-vindo!')
    expect(text('child')).toBe('Bem-vindo!')
    expect((element('select') as HTMLSelectElement).value).toBe('pt')
})

test('helpers from one React subscription support changing lists and calls outside rendering', async () => {
    let translate: TranslateFn
    const List = ({keys}: {keys: string[]}) => {
        const {trans, trans_choice} = useTranslator()
        translate = trans

        return h('div', null,
            h('p', {'data-testid': 'minutes'}, trans_choice(minutesKey, keys.length)),
            h('ul', {'data-testid': 'list'}, keys.map((key) => h('li', {key}, trans(key)))),
        )
    }

    await mount(h(List, {keys: ['Welcome!']}))
    expect(text('list')).toBe('Wecome!')
    expect(text('minutes')).toBe('1 minute ago')

    await act(() => root!.render(h(List, {keys: ['Welcome!', 'auth.failed']})))
    expect(container.querySelectorAll('li')).toHaveLength(2)
    expect(text('minutes')).toBe('2 minutes ago')

    await act(() => core.setLocale('pt'))
    expect(text('list')).toBe('Bem-vindo!As credenciais indicadas não coincidem com as registadas no sistema.')
    expect(text('minutes')).toBe('há 2 minutos')
    expect(translate!('Welcome, :name!', {name: 'Jane'})).toBe('Bem-vindo, Jane!')

    await act(() => root!.render(h(List, {keys: []})))
    expect(container.querySelectorAll('li')).toHaveLength(0)
})

test('catalogue updates refresh PHP and JSON translations without remounting', async () => {
    await mount(h(Translations))
    const title = element('title')

    await act(() => catalogue.setTranslations({en: {
        json: {'Welcome!': 'Live JSON'},
        php: {messages: {hello: 'Live PHP'}},
    }}))

    expect(element('title')).toBe(title)
    expect(text('title')).toBe('Live JSON')
    expect(text('php')).toBe('Live PHP')
    expect(element('input').getAttribute('placeholder')).toBe('Live JSON')
    expect(text('child')).toBe('Live JSON')
    expect(core.getLocale()).toEqual({locale: 'en', fallbackLocale: null})
})

test('the hook locale setter writes through to the core and preserves an explicit fallback', async () => {
    core.setLocale('en', 'en')
    await mount(h(Translations))

    await act(() => {
        const select = element('select') as HTMLSelectElement
        select.value = 'pt'
        select.dispatchEvent(new Event('change', {bubbles: true}))
    })

    expect(core.getLocale()).toEqual({locale: 'pt', fallbackLocale: 'en'})
    expect(text('title')).toBe('Bem-vindo!')
    expect(text('state')).toBe('pt|en')
})

test('fallback changes and disabling fallback update individual translation hooks', async () => {
    catalogue.setTranslations({
        en: {json: {Shared: 'English fallback'}},
        pt: {json: {Shared: 'Portuguese fallback'}},
    })
    core.setLocale('fr', null)
    const Fallback = () => h('p', {'data-testid': 'fallback'}, useTranslation('Shared'))
    await mount(h(Fallback))
    expect(text('fallback')).toBe('Shared')

    await act(() => core.setLocale('fr', 'en'))
    expect(text('fallback')).toBe('English fallback')
    await act(() => core.setLocale('fr', 'pt'))
    expect(text('fallback')).toBe('Portuguese fallback')
    await act(() => core.setLocale('fr', null))
    expect(text('fallback')).toBe('Shared')
})

test('individual hooks follow prop changes and explicit locales without changing the global locale', async () => {
    const Greeting = ({name, count, locale}: {name: string, count: number, locale: string}) => {
        const greeting = useTrans('Welcome, :name!', {name}, locale)
        const minutes = useTransChoice(minutesKey, count, {}, locale)
        const defaultTitle = useShortTranslation('Welcome!')
        return h('p', {'data-testid': 'translation'}, `${greeting}|${minutes}|${defaultTitle}`)
    }
    await mount(h(Greeting, {name: 'John', count: 1, locale: 'pt'}))
    expect(text('translation')).toBe('Bem-vindo, John!|há 1 minuto|Wecome!')
    expect(core.getLocale().locale).toBe('en')

    await act(() => root!.render(h(Greeting, {name: 'Jane', count: 2, locale: 'en'})))
    expect(text('translation')).toBe('Welcome, Jane!|2 minutes ago|Wecome!')

    await act(() => catalogue.setTranslations({en: {json: {
        'Welcome, :name!': 'Hello, :name!',
        [minutesKey]: '{1} :count minute|[2,*] :count minutes',
    }}}))
    expect(text('translation')).toBe('Hello, Jane!|2 minutes|Welcome!')
})

test('helper aliases share identities and explicit locales cannot mutate the render snapshot', async () => {
    let translator: ReactTranslator
    const Aliases = () => {
        translator = useTranslator()
        return h('p', null, translator.trans('Welcome!', {}, 'pt'), '|', translator.__('Welcome!'))
    }
    await mount(h(Aliases))

    expect(container.textContent).toBe('Bem-vindo!|Wecome!')
    expect(translator!.__).toBe(translator!.t)
    expect(translator!.__).toBe(translator!.trans)
    expect(translator!.trans_choice).toBe(translator!.transChoice)
    expect(translator!.trans_choice(minutesKey, 2, {}, 'pt')).toBe('há 2 minutos')
    expect(translator!.__('Welcome!')).toBe('Wecome!')
    expect(core.getLocale()).toEqual({locale: 'en', fallbackLocale: null})
})

test('unchanged state avoids rerenders and old helpers retain their render snapshot', async () => {
    const seen: ReactTranslator[] = []
    const Track = () => {
        const translator = useTranslator()
        seen.push(translator)
        return h('p', null, translator.__('Welcome!'))
    }
    await mount(h(Track))
    const first = seen[0]
    await act(() => core.setLocale('en', null))
    await act(() => catalogue.setTranslations(initialTranslations))
    expect(seen).toHaveLength(1)

    await act(() => root!.render(h(Track)))
    expect(seen.at(-1)).toBe(first)

    await act(() => core.setLocale('pt-BR', 'pt'))
    const next = seen.at(-1)!
    expect(next.locale).toBe('pt_BR')
    expect(next.fallbackLocale).toBe('pt')
    expect(next.__).not.toBe(first.__)
    expect(next.__('Welcome!')).toBe('Bem-vindo!')
    expect(first.__('Welcome!')).toBe('Wecome!')

    await act(() => catalogue.setTranslations({pt: {json: {'Welcome!': 'Updated'}}}))
    expect(seen.at(-1)!.__).not.toBe(next.__)
    expect(container.textContent).toBe('Updated')
    expect(next.__('Welcome!')).toBe('Bem-vindo!')
})

test('locale changes between render and subscription are not missed', async () => {
    const ChangeBeforeSubscribe = () => {
        useLayoutEffect(() => core.setLocale('pt'), [])
        return h(Translations)
    }
    await mount(h(ChangeBeforeSubscribe))
    expect(text('title')).toBe('Bem-vindo!')
    expect(text('state')).toBe('pt|')
})

test('StrictMode subscriptions are removed when the component unmounts', async () => {
    const stops: ReturnType<typeof vi.fn>[] = []
    const onLocaleChange = core.onLocaleChange
    const onTranslationsChange = catalogue.onTranslationsChange
    vi.spyOn(core, 'onLocaleChange').mockImplementation((listener) => {
        const unsubscribe = onLocaleChange(listener)
        const stop = vi.fn(() => { unsubscribe() })
        stops.push(stop)
        return stop
    })
    vi.spyOn(catalogue, 'onTranslationsChange').mockImplementation((listener) => {
        const unsubscribe = onTranslationsChange(listener)
        const stop = vi.fn(() => { unsubscribe() })
        stops.push(stop)
        return stop
    })
    const render = vi.fn()
    const Track = () => {
        const {__} = useTranslator()
        render()
        return h('p', null, __('Welcome!'))
    }
    await mount(h(StrictMode, null, h(Track)))
    expect(stops.filter((stop) => stop.mock.calls.length === 0)).toHaveLength(2)

    await act(() => core.setLocale('pt'))
    expect(container.textContent).toBe('Bem-vindo!')
    await act(() => root!.unmount())
    root = undefined
    expect(stops.length).toBeGreaterThanOrEqual(2)
    for (const stop of stops) expect(stop).toHaveBeenCalledTimes(1)

    const renderCount = render.mock.calls.length
    core.setLocale('en')
    catalogue.setTranslations({en: {json: {'Welcome!': 'After unmount'}}})
    expect(render).toHaveBeenCalledTimes(renderCount)
})

test('server markup hydrates without replacing translated elements and remains reactive', async () => {
    core.setLocale('pt', 'en')
    const Greeting = () => h('h1', {'data-testid': 'title'}, useTranslation('Welcome!'))
    container.innerHTML = renderToString(h(Greeting))
    const title = element('title')
    const onRecoverableError = vi.fn()

    await act(() => {
        root = hydrateRoot(container, h(Greeting), {onRecoverableError})
    })
    expect(element('title')).toBe(title)
    expect(text('title')).toBe('Bem-vindo!')
    expect(onRecoverableError).not.toHaveBeenCalled()

    await act(() => core.setLocale('en'))
    expect(element('title')).toBe(title)
    expect(text('title')).toBe('Wecome!')
})
