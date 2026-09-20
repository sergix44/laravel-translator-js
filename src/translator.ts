import {choose} from "./pluralizer";
import type {TranslationValue} from "./handle";

export interface Config {
    locale: string
    fallbackLocale: string | null
    translations: object
}

export const translator = (key: string, replace: object, pluralize: boolean, config: Config): TranslationValue => {
    const locale = config?.locale?.toLowerCase() ?? 'en'
    const fallbackLocale = config?.fallbackLocale?.toLowerCase()

    // Check if the key is a translation key
    let translation = getTranslation(key, locale, config.translations)

    // If not, check if the key is a translation key in the fallback locale
    if (!translation && fallbackLocale) {
        translation = getTranslation(key, fallbackLocale, config.translations)
    }

    return translate(translation ?? key, replace, locale, pluralize) as TranslationValue
}

const getTranslation = (key: string, locale: string, translations: object) => {
    let translation = null

    // Try to get the translation from the php array
    try {
        translation = key
            .split('.')
            .reduce((t, i) => t[i] || null, translations[locale].php)
    } catch (e) {
    }

    if (translation) {
        return translation
    }

    // JSON translations are keyed by the source string, which routinely contains dots
    // ("Get started.", "foo.bar"). Try an exact match before treating the key as a path,
    // or such a key is split apart and can never resolve.
    const json = translations[locale]?.json
    if (json && Object.prototype.hasOwnProperty.call(json, key)) {
        return json[key]
    }

    // Try to get the translation from the json array
    try {
        return key
            .split('.')
            .reduce((t, i) => t[i] || null, json)
    } catch (e) {
    }

    return translation
}

const translate = (translation: string | object, replace: object = {}, locale: string, shouldPluralize: boolean = false) => {
    if (shouldPluralize && typeof translation === 'string') {
        translation = choose(translation, replace['count'], locale);
    }

    // A partial key path resolves to a subtree. Placeholder replacement is a string
    // operation, so applying it here would stringify the subtree into "[object Object]".
    if (typeof translation !== 'string') {
        return translation
    }

    Object.keys(replace).forEach(key => {
        const value = replace[key]?.toString()

        translation = translation.toString()
            .replace(':' + key, value)
            .replace(':' + key.charAt(0).toUpperCase() + key.slice(1), value.charAt(0).toUpperCase() + value.slice(1))
            .replace(':' + key.toUpperCase(), value.toUpperCase())
    })

    return translation
}
