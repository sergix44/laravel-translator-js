import {choose} from "./pluralizer";

export interface Config {
    locale: string
    fallbackLocale: string | null
    translations: object
}

export const translator = (key: string, replace: object, pluralize: boolean, config: Config) => {
    const locale = config?.locale?.toLowerCase() ?? 'en'
    const fallbackLocale = config?.fallbackLocale?.toLowerCase()
    const segments = key.split('.')

    // Check if the key is a translation key
    let translation = getTranslation(key, segments, locale, config.translations)

    // If not, check if the key is a translation key in the fallback locale
    if (!translation && fallbackLocale) {
        translation = getTranslation(key, segments, fallbackLocale, config.translations)
    }

    return translate(translation ?? key, replace, locale, pluralize) as string
}

const getNestedTranslation = (translations: object, segments: string[]) => {
    let translation = translations

    for (const segment of segments) {
        if (translation == null) {
            return null
        }

        translation = translation[segment] || null
    }

    return translation
}

const getTranslation = (key: string, segments: string[], locale: string, translations: object) => {
    const catalogue = translations[locale]
    if (!catalogue) {
        return null
    }

    let translation = null

    // Try to get the translation from the php array
    try {
        translation = getNestedTranslation(catalogue.php, segments)
    } catch (e) {
    }

    if (translation) {
        return translation
    }

    // JSON translation keys are literal strings and may contain dots.
    const jsonTranslations = catalogue.json
    if (jsonTranslations && Object.prototype.hasOwnProperty.call(jsonTranslations, key)) {
        return jsonTranslations[key]
    }

    // Keep support for nested JSON objects.
    try {
        return getNestedTranslation(jsonTranslations, segments)
    } catch (e) {
    }

    return translation
}

const translate = (translation: string | object, replace: object = {}, locale: string, shouldPluralize: boolean = false) => {
    if (shouldPluralize && typeof translation === 'string') {
        translation = choose(translation, replace['count'], locale);
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
