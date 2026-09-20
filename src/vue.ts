import {computed, isRef, shallowRef, watch, type ComputedRef, type Ref} from 'vue'
import {registerReactivityAdapter} from './reactivity'
import {getLocale, setLocale, type LocaleState} from './store'

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
 * Drive the translator from a Vue ref, so changing the ref changes the global locale.
 * Returns a function that stops the sync.
 */
export const syncLocale = (
    locale: Ref<string> | string,
    fallbackLocale?: Ref<string | null> | string | null,
) => {
    const readFallback = () => (isRef(fallbackLocale) ? fallbackLocale.value : fallbackLocale)

    setLocale(isRef(locale) ? locale.value : locale, readFallback())

    const stopLocale = isRef(locale)
        ? watch(locale, (next) => setLocale(next, readFallback()), {flush: 'sync'})
        : null

    const stopFallback = isRef(fallbackLocale)
        ? watch(fallbackLocale, (next) => setLocale(getLocale().locale, next), {flush: 'sync'})
        : null

    return () => {
        stopLocale?.()
        stopFallback?.()
    }
}
