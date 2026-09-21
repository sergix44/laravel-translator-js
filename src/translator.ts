import {choose} from "./pluralizer";
import type {TranslationValue} from './value'

type TranslationTree = Record<string, unknown>

export const translator = (
    key: string,
    replace: object,
    pluralize: boolean,
    activeLocale: string,
    activeFallbackLocale: string | null,
    translations: object,
): TranslationValue => {
    const locale = activeLocale.toLowerCase()
    const fallbackLocale = activeFallbackLocale?.toLowerCase()

    // Check if the key is a translation key
    let translation = getTranslation(key, locale, translations)

    // If not, check if the key is a translation key in the fallback locale
    if (!translation && fallbackLocale) {
        translation = getTranslation(key, fallbackLocale, translations)
    }

    return translate(translation ?? key, replace, locale, pluralize) as TranslationValue
}

const getPath = (source: unknown, segments: string[]): TranslationValue | null => {
    let value = source

    for (const segment of segments) {
        if (!value || typeof value !== 'object') {
            return null
        }

        value = (value as TranslationTree)[segment]
    }

    return (value ?? null) as TranslationValue | null
}

const getTranslation = (key: string, locale: string, translations: object) => {
    const catalogue = (translations as TranslationTree)[locale] as TranslationTree | undefined
    if (!catalogue) {
        return null
    }

    const segments = key.split('.')
    const translation = getPath(catalogue.php, segments)

    if (translation) {
        return translation
    }

    // JSON translations are keyed by the source string, which routinely contains dots
    // ("Get started.", "foo.bar"). Try an exact match before treating the key as a path,
    // or such a key is split apart and can never resolve.
    const json = catalogue.json as TranslationTree | undefined
    if (json && Object.prototype.hasOwnProperty.call(json, key)) {
        return json[key] as TranslationValue
    }

    return getPath(json, segments)
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

    for (const key in replace) {
        if (!Object.prototype.hasOwnProperty.call(replace, key)) {
            continue
        }

        const value = replace[key]?.toString()

        translation = translation
            .replace(':' + key, value)
            .replace(':' + key.charAt(0).toUpperCase() + key.slice(1), value.charAt(0).toUpperCase() + value.slice(1))
            .replace(':' + key.toUpperCase(), value.toUpperCase())
    }

    return translation
}
