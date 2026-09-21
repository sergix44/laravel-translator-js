import {shared} from './shared'
import {resolveLocale} from './store'
import {translator} from './translator'
import type {TranslationValue} from './value'

export const EMPTY_REPLACEMENTS: object = Object.freeze({})

/** Immediate translation path used by framework adapters that need a plain value. */
export const translateValue = (
    key: string,
    replace: object = EMPTY_REPLACEMENTS,
    locale?: string,
    pluralize = false,
): TranslationValue => translator(
    key,
    replace,
    pluralize,
    resolveLocale(locale),
    shared.fallbackLocale,
    shared.translations,
)

/** Immediate pluralized translation path used by framework adapters. */
export const translateChoiceValue = (
    key: string,
    number: number,
    replace: object = EMPTY_REPLACEMENTS,
    locale?: string,
): TranslationValue => translateValue(key, {...replace, count: number}, locale, true)
