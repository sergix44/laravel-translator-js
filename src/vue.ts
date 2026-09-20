import {computed, isRef, shallowRef, watch, type ComputedRef, type Ref} from 'vue'
import {registerReactivityAdapter} from './reactivity'
import {getLocale, setLocale as setGlobalLocale, type LocaleState} from './store'
import {trans as createTranslation, transChoice as createTranslationChoice} from './index'

/**
 * Importing this module is the entire Vue setup.
 *
 * It teaches the translator to read and write a Vue ref, so any `trans()` read inside any
 * render function, `computed` or `watchEffect` registers a dependency and re-runs when the
 * locale changes. No plugin, no `provide`, no `globalProperties`.
 */
const version = shallowRef(0)

registerReactivityAdapter({
    track: () => {
        // Reading the ref is the dependency registration. Vue tracks dynamically, so this
        // works no matter how deeply nested the read is inside the effect.
        void version.value
    },
    trigger: () => {
        version.value++
    },
})

/** The active locale as a Vue computed, for UI that displays or switches languages. */
export const useLocale = (): ComputedRef<Readonly<LocaleState>> => {
    return computed(() => {
        void version.value

        return getLocale()
    })
}

/**
 * Set the active locale.
 *
 * Given a string it behaves like `setLocale` from the core entry point. Given a ref it
 * also keeps the two in sync, so later writes to the ref change the locale as well.
 *
 * Returns a function that stops watching; it is a no-op when no ref was passed.
 */
export const setLocale = (
    locale: Ref<string> | string,
    fallbackLocale?: Ref<string | null> | string | null,
) => {
    const readFallback = () => (isRef(fallbackLocale) ? fallbackLocale.value : fallbackLocale)

    setGlobalLocale(isRef(locale) ? locale.value : locale, readFallback())

    const stopLocale = isRef(locale)
        ? watch(locale, (next) => setGlobalLocale(next, readFallback()), {flush: 'sync'})
        : null

    const stopFallback = isRef(fallbackLocale)
        ? watch(fallbackLocale, (next) => setGlobalLocale(getLocale().locale, next), {flush: 'sync'})
        : null

    return () => {
        stopLocale?.()
        stopFallback?.()
    }
}

/**
 * Translate to a plain string.
 *
 * The tracker registers the dependency while this runs, so calling it from a template, a
 * computed or a watchEffect is reactive: the effect re-runs on a locale change and calls
 * this again. Returning a real string keeps the value assignable to `string` props, which
 * matters for third-party components.
 *
 * Hoisting the result out of a reactive context gives a dead string. Wrap it in
 * `computed(() => trans('key'))`, or use the handle from `laravel-translator` instead.
 */
export const trans = (key: string, replace?: object, locale?: string): string =>
    String(createTranslation(key, replace, locale))

/** Translate with pluralization, to a plain string. */
export const transChoice = (key: string, number: number, replace?: object, locale?: string): string =>
    String(createTranslationChoice(key, number, replace, locale))

export const __ = trans
export const t = trans
export const trans_choice = transChoice
