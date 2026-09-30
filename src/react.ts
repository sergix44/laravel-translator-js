import {useMemo, useSyncExternalStore} from 'react'
import {getTranslations, onTranslationsChange} from './catalogue'
import {getLocale, onLocaleChange, setLocale, trans, transChoice, type LocaleState} from './index'

export type TranslateFn = (key: string, replace?: object, locale?: string) => string
export type TranslateChoiceFn = (key: string, number: number, replace?: object, locale?: string) => string

export interface ReactTranslator extends Readonly<LocaleState> {
    __: TranslateFn
    t: TranslateFn
    trans: TranslateFn
    trans_choice: TranslateChoiceFn
    transChoice: TranslateChoiceFn
    setLocale: typeof setLocale
}

interface TranslationSnapshot extends Readonly<LocaleState> {
    readonly translations: object
}

let snapshot: TranslationSnapshot | undefined

// React requires the same snapshot identity until the underlying data changes.
const getSnapshot = (): TranslationSnapshot => {
    const {locale, fallbackLocale} = getLocale()
    const translations = getTranslations()

    if (!snapshot || snapshot.locale !== locale || snapshot.fallbackLocale !== fallbackLocale
        || snapshot.translations !== translations) {
        snapshot = {locale, fallbackLocale, translations}
    }

    return snapshot
}

const subscribe = (notify: () => void) => {
    const stopLocale = onLocaleChange(notify)
    const stopTranslations = onTranslationsChange(notify)

    return () => {
        stopLocale()
        stopTranslations()
    }
}

/** Subscribe once per component; returned translation helpers are regular functions, not hooks. */
export const useTranslator = (): ReactTranslator => {
    const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

    return useMemo(() => {
        // Bind helpers to this render's snapshot. The core may modify its config
        // for an explicit locale, so each call receives its own copy.
        const translate: TranslateFn = (key, replace, locale) => trans(key, replace, locale, {...current})
        const translateChoice: TranslateChoiceFn = (key, number, replace, locale) =>
            transChoice(key, number, replace, locale, {...current})

        return {
            __: translate,
            t: translate,
            trans: translate,
            trans_choice: translateChoice,
            transChoice: translateChoice,
            locale: current.locale,
            fallbackLocale: current.fallbackLocale,
            setLocale,
        }
    }, [current])
}

/** A translated string that follows locale and translation catalogue changes. */
export const useTranslation = (key: string, replace: object = {}, locale?: string): string =>
    useTranslator().trans(key, replace, locale)

/** A pluralized string that follows locale and translation catalogue changes. */
export const useTranslationChoice = (
    key: string,
    number: number,
    replace: object = {},
    locale?: string,
): string => useTranslator().transChoice(key, number, replace, locale)
