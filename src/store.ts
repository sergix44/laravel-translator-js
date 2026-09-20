import type {Config} from './translator'
import {invalidate, onInvalidate} from './reactivity'
import {shared} from './shared'
// @ts-ignore
import translations from 'virtual-laravel-translations'

declare global {
    interface Window {
        locale?: string;
        fallbackLocale?: string;
    }
}

export type {LocaleState} from './shared'
import type {LocaleState} from './shared'

export type LocaleChangeListener = (state: Readonly<LocaleState>) => void

const normalize = (locale: string | null | undefined): string | null =>
    locale ? locale.replace(/-/g, '_') : null

// Only the first copy of this module to load seeds the state; every later copy reuses it.
if (!shared.initialized) {
    const doc = globalThis.document

    shared.initialized = true
    shared.locale = (doc && normalize(doc.documentElement?.lang)) || 'en'
    shared.fallbackLocale = normalize((globalThis as {fallbackLocale?: string}).fallbackLocale)
    shared.translations = translations
    shared.snapshot = {locale: shared.locale, fallbackLocale: shared.fallbackLocale}
}

/**
 * Identity-stable: it only changes when the locale does. React's useSyncExternalStore
 * compares snapshots by reference and would loop forever on a fresh object per call.
 */
export const getLocale = (): Readonly<LocaleState> => shared.snapshot

/** The config handed to the pure `translator()`, optionally pinned to one locale. */
export const resolveConfig = (locale?: string): Config => ({
    locale: (locale && normalize(locale)) || shared.locale,
    fallbackLocale: shared.fallbackLocale,
    translations: shared.translations,
})

/**
 * Change the active locale and invalidate every live translation.
 *
 * Omitting `fallbackLocale` preserves the current one; pass `null` to clear it.
 */
export const setLocale = (locale: string, fallbackLocale?: string | null) => {
    const nextLocale = normalize(locale) ?? 'en'
    const nextFallbackLocale = fallbackLocale === undefined
        ? shared.fallbackLocale
        : normalize(fallbackLocale)

    if (shared.locale === nextLocale && shared.fallbackLocale === nextFallbackLocale) {
        return
    }

    shared.locale = nextLocale
    shared.fallbackLocale = nextFallbackLocale
    shared.snapshot = {locale: nextLocale, fallbackLocale: nextFallbackLocale}

    invalidate()
}

/** Replace the translation catalogue. Used by the Vite plugin on hot reload. */
export const setTranslations = (next: object) => {
    shared.translations = next ?? {}

    invalidate()
}

/** Raw locale-change event, for consumers that want the state rather than a handle. */
export const onLocaleChange = (listener: LocaleChangeListener) =>
    onInvalidate(() => listener(shared.snapshot))
