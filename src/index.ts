import {Config, translator} from './translator'
// @ts-ignore
import translations from 'virtual:laravel-translations'

declare global {
    interface Window {
        locale: string;
        fallbackLocale: string;
    }
}

const isServer = typeof window === 'undefined'

const defaultConfig: Config = {
    locale: !isServer && document.documentElement.lang ? document.documentElement.lang.replace('-', '_') : 'en',
    fallbackLocale: !isServer && window ? window?.fallbackLocale : null,
    translations: translations,
}

const trans = (key: string, replace: object = {}, locale: string = null, config: Config = null) => {
    if (locale) {
        (config ?? defaultConfig).locale = locale
    }

    return translator(key, replace, false, config ?? defaultConfig)
}

const transChoice = (key: string, number: number, replace: Object = {}, locale: string = null, config: Config = null) => {
    if (locale) {
        (config ?? defaultConfig).locale = locale
    }

    return translator(key, {...replace, count: number}, true, config ?? defaultConfig)
}

const __ = trans;
const t = trans;
const trans_choice = transChoice;

export {trans, __, t, transChoice, trans_choice}