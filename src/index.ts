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

const setLocale = (locale: string, fallbackLocale: string | null = null) => {
    defaultConfig.locale = locale?.replace('-', '_') ?? 'en'
    defaultConfig.fallbackLocale = fallbackLocale?.replace('-', '_') ?? null
}

const __ = trans;
const t = trans;
const trans_choice = transChoice;

export {trans, __, t, transChoice, trans_choice, setLocale}