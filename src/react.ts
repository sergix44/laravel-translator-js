import {useCallback, useMemo, useSyncExternalStore} from 'react'
import {getLocale, onLocaleChange, type LocaleState} from './store'
import {trans, transChoice} from './index'

/**
 * React cannot render the handle object itself — `<p>{trans('x')}</p>` throws
 * "Objects are not valid as a React child" — so these hooks hand back plain strings and
 * re-render the component when the locale changes.
 */

const subscribe = (onStoreChange: () => void) => onLocaleChange(onStoreChange)

/** The active locale. Re-renders the component whenever it changes. */
export const useLocale = (): Readonly<LocaleState> =>
    // getLocale returns a cached snapshot, so it is safe as both client and server
    // snapshot: an unstable identity here would loop forever.
    useSyncExternalStore(subscribe, getLocale, getLocale)

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
    const locale = useLocale()

    const translate = useCallback(
        (key: string, replace?: object, forLocale?: string) => String(trans(key, replace, forLocale)),
        [locale],
    )

    const translateChoice = useCallback(
        (key: string, number: number, replace?: object, forLocale?: string) =>
            String(transChoice(key, number, replace, forLocale)),
        [locale],
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
