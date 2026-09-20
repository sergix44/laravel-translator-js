import {translator} from './translator'
import {createHandle, TranslationHandle} from './handle'
import {resolveConfig} from './store'

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

const trans = (key: string, replace: object = {}, locale?: string): TranslationHandle => {
    const replacements = snapshotReplacements(replace)

    return createHandle(() => translator(key, replacements, false, resolveConfig(locale)))
}

/** Translate a key with pluralization driven by `number`. */
const transChoice = (key: string, number: number, replace: object = {}, locale?: string): TranslationHandle => {
    const replacements = {...replace, count: number}

    return createHandle(() => translator(key, replacements, true, resolveConfig(locale)))
}

const __ = trans
const t = trans
const trans_choice = transChoice

export {trans, __, t, transChoice, trans_choice}
