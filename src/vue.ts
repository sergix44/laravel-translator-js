import {
    computed,
    getCurrentScope,
    isRef,
    onScopeDispose,
    shallowRef,
    watch,
    type ComputedRef,
    type Ref,
    type ShallowRef,
} from 'vue'
import {registerReactivityAdapter, track} from './reactivity'
import {getLocale, onLocaleChange, setLocale as setGlobalLocale, type LocaleState} from './store'
import {translateChoiceValue, translateValue} from './translate'
import {stringifyTranslation} from './value'

/**
 * Importing this module is the entire Vue setup.
 *
 * It teaches the translator to read and write a Vue ref, so any `trans()` read inside any
 * render function, `computed` or `watchEffect` registers a dependency and re-runs when the
 * locale or translation catalogue changes. No plugin, no `provide`, no `globalProperties`.
 */
interface VueAdapterState {
    version: ShallowRef<number>
}

const VUE_ADAPTERS_KEY = Symbol.for('laravel-translator@2.vue-adapters')
const container = globalThis as Record<symbol, WeakMap<object, VueAdapterState> | undefined>
const runtimeAdapters = container[VUE_ADAPTERS_KEY] ??= new WeakMap()
let adapterState = runtimeAdapters.get(shallowRef)

if (!adapterState) {
    const version = shallowRef(0)

    registerReactivityAdapter({
        track: () => {
            // Reading the ref is the dependency registration. Vue tracks dynamically, so
            // this works no matter how deeply nested the read is inside the effect.
            void version.value
        },
        trigger: () => {
            version.value++
        },
    })

    adapterState = {version}
    runtimeAdapters.set(shallowRef, adapterState)
}

const version = adapterState.version

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
 * binds the ref to the shared locale in both directions: changing either one updates the
 * other. The same applies to a fallback-locale ref.
 *
 * Returns a function that stops the binding; it is a no-op when no ref was passed.
 */
export const setLocale = (
    locale: Ref<string> | string,
    fallbackLocale?: Ref<string | null> | string | null,
) => {
    const initialLocale = isRef(locale) ? locale.value : locale
    const localeRef: Ref<string> | null = isRef(locale) ? locale : null
    const fallbackRef: Ref<string | null> | null = isRef(fallbackLocale) ? fallbackLocale : null
    const fallbackValue: string | null | undefined = isRef(fallbackLocale)
        ? undefined
        : fallbackLocale
    const readFallback = () => fallbackRef ? fallbackRef.value : fallbackValue

    setGlobalLocale(initialLocale, readFallback())

    // Reflect normalization (for example pt-BR -> pt_BR) before installing watchers.
    const initial = getLocale()
    if (localeRef) localeRef.value = initial.locale
    if (fallbackRef) fallbackRef.value = initial.fallbackLocale

    // Store-driven ref writes must not be echoed back one at a time. Without this guard,
    // updating locale and fallback together could briefly restore the old fallback.
    let updatingFromStore = false

    const stopLocale = localeRef
        ? watch(localeRef, (next) => {
            if (!updatingFromStore) setGlobalLocale(next, readFallback())
        }, {flush: 'sync'})
        : null

    const stopFallback = fallbackRef
        ? watch(fallbackRef, (next) => {
            if (!updatingFromStore) setGlobalLocale(getLocale().locale, next)
        }, {flush: 'sync'})
        : null

    const stopStore = localeRef || fallbackRef
        ? onLocaleChange((next) => {
            updatingFromStore = true

            try {
                if (localeRef && localeRef.value !== next.locale) {
                    localeRef.value = next.locale
                }
                if (fallbackRef && fallbackRef.value !== next.fallbackLocale) {
                    fallbackRef.value = next.fallbackLocale
                }
            } finally {
                updatingFromStore = false
            }
        })
        : null

    const dispose = () => {
        stopLocale?.()
        stopFallback?.()
        stopStore?.()
    }

    // Component setup and effect scopes own their bindings automatically. Calling the
    // returned disposer manually remains safe because Vue stop functions are idempotent.
    if ((localeRef || fallbackRef) && getCurrentScope()) {
        onScopeDispose(dispose)
    }

    return dispose
}

/**
 * Translate to a plain string.
 *
 * The tracker registers the dependency while this runs, so calling it from a template, a
 * computed or a watchEffect is reactive: the effect re-runs on a locale or catalogue
 * change and calls this again. Returning a real string keeps the value assignable to
 * `string` props, which matters for third-party components.
 *
 * Hoisting the result out of a reactive context gives a dead string. Wrap it in
 * `computed(() => trans('key'))`, or use the handle from `laravel-translator` instead.
 */
export const trans = (key: string, replace?: object, locale?: string): string => {
    track()

    return stringifyTranslation(translateValue(key, replace, locale))
}

/** Translate with pluralization, to a plain string. */
export const transChoice = (key: string, number: number, replace?: object, locale?: string): string => {
    track()

    return stringifyTranslation(translateChoiceValue(key, number, replace, locale))
}

export const __ = trans
export const t = trans
export const trans_choice = transChoice
