import {Config, translator} from './translator'
// @ts-ignore
import translations from 'virtual-laravel-translations'

declare global {
    interface Window {
        locale?: string;
        fallbackLocale?: string;
    }
}

const isServer = typeof window === 'undefined'

const defaultConfig: Config = {
    locale: !isServer && document.documentElement.lang ? document.documentElement.lang.replace('-', '_') : 'en',
    fallbackLocale: !isServer && window ? window?.fallbackLocale?.replace('-', '_') : null,
    translations: translations,
}

export interface LocaleState {
    locale: string
    fallbackLocale: string | null
}

export type LocaleChangeListener = (state: Readonly<LocaleState>) => void

const localeChangeListeners = new Set<LocaleChangeListener>()

const trans = (key: string, replace: object = {}, locale: string = null, config: Config = null) => {
    if (locale) {
        if (!config) {
            config = {...defaultConfig}
        }
        config.locale = locale
    }

    return translator(key, replace, false, config ?? defaultConfig)
}

const transChoice = (key: string, number: number, replace: Object = {}, locale: string = null, config: Config = null) => {
    if (locale) {
        if (!config) {
            config = {...defaultConfig}
        }
        config.locale = locale
    }

    return translator(key, {...replace, count: number}, true, config ?? defaultConfig)
}

const getLocale = (): LocaleState => ({
    locale: defaultConfig.locale,
    fallbackLocale: defaultConfig.fallbackLocale,
})

const onLocaleChange = (listener: LocaleChangeListener) => {
    localeChangeListeners.add(listener)

    return () => {
        localeChangeListeners.delete(listener)
    }
}

const setLocale = (locale: string, fallbackLocale: string | null = null) => {
    const nextLocale = locale?.replace('-', '_') ?? 'en'
    const nextFallbackLocale = fallbackLocale?.replace('-', '_') ?? null

    if (defaultConfig.locale === nextLocale && defaultConfig.fallbackLocale === nextFallbackLocale) {
        return
    }

    defaultConfig.locale = nextLocale
    defaultConfig.fallbackLocale = nextFallbackLocale

    const state = getLocale()
    localeChangeListeners.forEach((listener) => listener(state))
}

const __ = trans;
const t = trans;
const trans_choice = transChoice;

export {trans, __, t, transChoice, trans_choice, getLocale, onLocaleChange, setLocale}
