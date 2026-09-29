import {Config, translator} from './translator'
import {getTranslations, onTranslationsChange, trackTranslationRead} from './catalogue'

const root = typeof document !== 'undefined' ? document.documentElement : null
const readLocale = () => root?.getAttribute('lang')?.replace(/-/g, '_') || 'en'
const readFallbackLocale = () => root?.getAttribute('data-fallback-lang')?.replace(/-/g, '_') || null

const defaultConfig: Config = {
    locale: readLocale(),
    fallbackLocale: readFallbackLocale(),
    translations: getTranslations(),
}

onTranslationsChange((translations) => {
    defaultConfig.translations = translations
})

export interface LocaleState {
    locale: string
    fallbackLocale: string | null
}

export type LocaleChangeListener = (state: Readonly<LocaleState>) => void

const localeListeners = new Set<LocaleChangeListener>()

const getLocale = (): LocaleState => ({
    locale: defaultConfig.locale,
    fallbackLocale: defaultConfig.fallbackLocale,
})

const onLocaleChange = (listener: LocaleChangeListener) => {
    localeListeners.add(listener)
    return () => localeListeners.delete(listener)
}

const trans = (key: string, replace: object = {}, locale: string = null, config: Config = null) => {
    trackTranslationRead()

    if (locale) {
        if (!config) {
            config = {...defaultConfig}
        }
        config.locale = locale
    }

    return translator(key, replace, false, config ?? defaultConfig)
}

const transChoice = (key: string, number: number, replace: Object = {}, locale: string = null, config: Config = null) => {
    trackTranslationRead()

    if (locale) {
        if (!config) {
            config = {...defaultConfig}
        }
        config.locale = locale
    }

    return translator(key, {...replace, count: number}, true, config ?? defaultConfig)
}

const setLocale = (locale: string, fallbackLocale: string | null = null) => {
    const nextLocale = locale?.replace(/-/g, '_') ?? 'en'
    const nextFallbackLocale = fallbackLocale?.replace(/-/g, '_') ?? null

    if (defaultConfig.locale === nextLocale && defaultConfig.fallbackLocale === nextFallbackLocale) {
        return
    }

    defaultConfig.locale = nextLocale
    defaultConfig.fallbackLocale = nextFallbackLocale

    const state = getLocale()
    for (const listener of [...localeListeners]) {
        try {
            listener(state)
        } catch (error) {
            console.error('[laravel-translator] a locale change listener threw', error)
        }
    }
}

if (root && typeof MutationObserver !== 'undefined') {
    new MutationObserver((mutations) => {
        const changedLocale = mutations.some(({attributeName}) => attributeName === 'lang')
        const changedFallback = mutations.some(({attributeName}) => attributeName === 'data-fallback-lang')
        const current = getLocale()
        setLocale(
            changedLocale ? readLocale() : current.locale,
            changedFallback ? readFallbackLocale() : current.fallbackLocale,
        )
    }).observe(root, {attributes: true, attributeFilter: ['lang', 'data-fallback-lang']})
}

const __ = trans;
const t = trans;
const trans_choice = transChoice;

export {trans, __, t, transChoice, trans_choice, getLocale, onLocaleChange, setLocale, onTranslationsChange}
