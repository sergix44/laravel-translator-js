export interface Config {
    locale: string
    fallbackLocale: string
    translations: object
}

export const translator = (key: string, replace: object, pluralize: boolean, config: Config) => {
    const locale = config?.locale?.toLowerCase() ?? 'en'
    const fallbackLocale = config?.fallbackLocale?.toLowerCase()

    // Check if the key is a translation key
    let translation = getTranslation(key, locale, config.translations)

    // If not, check if the key is a translation key in the fallback locale
    if (!translation && fallbackLocale) {
        translation = getTranslation(key, fallbackLocale, config.translations)
    }

    return translate(translation ?? key, replace, pluralize)
}

const getTranslation = (key: string, locale: string, translations: object) => {
    try {
        return key
            .split('.')
            .reduce((t, i) => t[i] || null, translations[locale].php)
    } catch (e) {
    }

    try {
        return key
            .split('.')
            .reduce((t, i) => t[i] || null, translations[locale].json)
    } catch (e) {
    }

    return null
}

const translate = (translation: string, replace: object = {}, shouldPluralize: boolean = false) => {
    let translated = shouldPluralize ? pluralize(translation, replace['count']) : translation
    if (typeof replace === 'undefined') {
        return translation
    }

    Object.keys(replace).forEach(key => {
        const value = replace[key]
        translated = translated.toString().replace(':' + key, value)
    })

    return translated
}

const stripConditions = (sentence: string) => {
    return sentence.replace(/^[\{\[]([^\[\]\{\}]*)[\}\]]/, '')
}

const pluralize = (sentence: string, count: number) => {
    let parts = sentence.split('|')

    //Get SOLO number pattern parts
    const soloPattern = /{(?<count>\d+\.?\d*)}[^\|]*/g
    const soloParts = parts.map(part => {
        let matched = part.matchAll(soloPattern).next().value
        if (!matched) {
            return;
        }
        return {
            count: 1 * matched[1],
            value: stripConditions(matched[0]).trim()
        }
    }).filter((o) => o !== undefined)
    let i = 0;
    //Loop through the solo parts
    while (i < soloParts.length) {
        const p = soloParts[i]
        if (p.count === count) {
            return p.value
        }
        i++;
    }

    //Get ranged pattern parts
    const rangedPattern = /\[(?<start>\d+|\*),(?<end>\d+|\*)][^\|]*/g
    const rangedParts = parts.map(part => {
        let matched = part.matchAll(rangedPattern).next().value
        if (!matched) {
            return;
        }
        return {
            start: parseInt(matched[1]),
            end: parseInt(matched[2]) || -1,
            value: matched[0].replace(`[${matched[1]},${matched[2]}]`, '').trim()
        }
    }).filter((o) => o !== undefined)

    i = 0;
    //Loop through the solo parts
    while (i < rangedParts.length) {
        const p = rangedParts[i]

        if (count >= p.start || isNaN(p.start)) {
            if (p.end < 0 || count <= p.end) {
                return p.value
            }
        }

        i++;
    }

    if (parts.length > 1) {
        const index = count == 1 ? 0 : 1;
        return stripConditions(parts[index] ?? parts[0]).trim()
    }

    return sentence
}