import {Config, translator} from './translator'
import {getTranslations, onTranslationsChange} from './catalogue'

export {getLocale, setLocale, setTranslations, onLocaleChange} from './store'
export type {LocaleState, LocaleChangeListener} from './store'
export {registerReactivityAdapter} from './reactivity'
export type {ReactivityAdapter} from './reactivity'
export type {TranslationHandle, TranslationValue} from './handle'

/**
 * Translate a key. Returns a live handle rather than a string: reading it always reflects
 * the current locale, and it coerces to a string wherever one is expected.
 */
/**
 * Copied because the handle is lazy: without this, mutating the caller's object after
 * calling trans() would silently change the translation at the next locale change.
 */
const snapshotReplacements = (replace: object): object =>
    Object.keys(replace).length > 0 ? {...replace} : replace

const trans = (key: string, replace: object = EMPTY_REPLACEMENTS, locale?: string): TranslationHandle => {
    const replacements = snapshotReplacements(replace)

    return createHandle(() => translateValue(key, replacements, locale))
}

/** Translate a key with pluralization driven by `number`. */
const transChoice = (
    key: string,
    number: number,
    replace: object = EMPTY_REPLACEMENTS,
    locale?: string,
): TranslationHandle => {
    const replacements = {...replace, count: number}

const defaultConfig: Config = {
    locale: !isServer && document.documentElement.lang ? document.documentElement.lang.replace('-', '_') : 'en',
    fallbackLocale: !isServer && window ? window?.fallbackLocale?.replace('-', '_') : null,
    translations: getTranslations(),
}

onTranslationsChange((translations) => {
    defaultConfig.translations = translations
})

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

export {trans, __, t, transChoice, trans_choice, setLocale, onTranslationsChange}
