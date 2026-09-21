import {useCallback, useMemo, useSyncExternalStore} from 'react'
import {getVersion, onInvalidate} from './reactivity'
import {getLocale, onLocaleChange, type LocaleState} from './store'
import {translateChoiceValue, translateValue} from './translate'
import {stringifyTranslation} from './value'

/**
 * React cannot render the handle object itself — `<p>{trans('x')}</p>` throws
 * "Objects are not valid as a React child" — so these hooks hand back plain strings and
 * re-render the component when the locale or translation catalogue changes.
 */

const subscribeToLocale = (onStoreChange: () => void) => onLocaleChange(onStoreChange)
const subscribeToChanges = (onStoreChange: () => void) => onInvalidate(onStoreChange)

/** The active locale. Re-renders the component whenever it changes. */
export const useLocale = (): Readonly<LocaleState> =>
    // getLocale returns a cached snapshot, so it is safe as both client and server
    // snapshot: an unstable identity here would loop forever.
    useSyncExternalStore(subscribeToLocale, getLocale, getLocale)

export interface Translator {
    trans: (key: string, replace?: object, locale?: string) => string
    transChoice: (key: string, number: number, replace?: object, locale?: string) => string
    __: (key: string, replace?: object, locale?: string) => string
    t: (key: string, replace?: object, locale?: string) => string
    trans_choice: (key: string, number: number, replace?: object, locale?: string) => string
    locale: Readonly<LocaleState>
}

/**
 * Translation functions bound to the active locale.
 *
 *   const {__} = useTranslator()
 *   return <h1>{__('page.title')}</h1>
 */
export const useTranslator = (): Translator => {
    // Unlike the locale snapshot, this revision also changes when Vite installs a new
    // translation catalogue while preserving component state.
    const revision = useSyncExternalStore(subscribeToChanges, getVersion, getVersion)
    const locale = getLocale()

    const translate = useCallback(
        (key: string, replace?: object, forLocale?: string) =>
            stringifyTranslation(translateValue(key, replace, forLocale)),
        [locale, revision],
    )

    const translateChoice = useCallback(
        (key: string, number: number, replace?: object, forLocale?: string) =>
            stringifyTranslation(translateChoiceValue(key, number, replace, forLocale)),
        [locale, revision],
    )

    return useMemo(() => ({
        trans: translate,
        transChoice: translateChoice,
        __: translate,
        t: translate,
        trans_choice: translateChoice,
        locale,
    }), [translate, translateChoice, locale])
}
