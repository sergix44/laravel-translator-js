import {computed, isRef, shallowRef, toValue, watch, type App, type ComputedRef, type MaybeRefOrGetter, type Ref} from 'vue'
import {getLocale, onLocaleChange, setLocale, trans as translate, trans_choice as translateChoice, type LocaleState} from './index'
import {onTranslationsChange, registerTranslationReadTracker} from './catalogue'

const revision = shallowRef(0)

registerTranslationReadTracker(() => {
    void revision.value
})
onLocaleChange(() => {
    revision.value++
})
onTranslationsChange(() => {
    revision.value++
})

export interface VueTranslatorOptions {
    locale?: string | Ref<string>
    fallbackLocale?: string | null | Ref<string | null>
}

/** String helpers track locale and catalogue reads inside Vue reactive effects. */
export const trans = translate
export const trans_choice = translateChoice
export const __ = trans
export const t = trans
export const transChoice = trans_choice

/** A computed translation that follows locale, catalogue, and reactive argument changes. */
export const use_trans = (
    key: MaybeRefOrGetter<string>,
    replace: MaybeRefOrGetter<object> = {},
    locale?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string> => computed(() => translate(toValue(key), toValue(replace), toValue(locale)))

/** A computed pluralized translation; counts and other arguments may be refs or getters. */
export const use_trans_choice = (
    key: MaybeRefOrGetter<string>,
    number: MaybeRefOrGetter<number>,
    replace: MaybeRefOrGetter<object> = {},
    locale?: MaybeRefOrGetter<string | undefined>,
): ComputedRef<string> => computed(() => translateChoice(toValue(key), toValue(number), toValue(replace), toValue(locale)))

export const ___ = use_trans
export const useTranslation = use_trans
export const useTranslationChoice = use_trans_choice

export const LaravelTranslatorVue = {
    install(app: App, options: VueTranslatorOptions = {}) {
        const localeRef = isRef(options.locale) ? options.locale : null
        const fallbackRef = isRef(options.fallbackLocale) ? options.fallbackLocale : null
        let syncingFromTranslator = false

        const syncRefs = (state: Readonly<LocaleState>) => {
            syncingFromTranslator = true
            try {
                if (localeRef && localeRef.value !== state.locale) {
                    localeRef.value = state.locale
                }
                if (fallbackRef && fallbackRef.value !== state.fallbackLocale) {
                    fallbackRef.value = state.fallbackLocale
                }
            } finally {
                syncingFromTranslator = false
            }
        }

        const stopLocaleSubscription = localeRef || fallbackRef
            ? onLocaleChange(syncRefs)
            : () => {}

        if (options.locale !== undefined || options.fallbackLocale !== undefined) {
            const current = getLocale()
            const initialLocale = localeRef?.value ?? (typeof options.locale === 'string' ? options.locale : current.locale)
            let initialFallback: string | null = current.fallbackLocale
            if (fallbackRef) {
                initialFallback = fallbackRef.value
            } else if (typeof options.fallbackLocale === 'string') {
                initialFallback = options.fallbackLocale
            } else if (options.fallbackLocale === null) {
                initialFallback = null
            }

            setLocale(initialLocale, initialFallback)
        }

        syncRefs(getLocale())

        const stopLocaleWatcher = localeRef
            ? watch(localeRef, (locale) => {
                if (!syncingFromTranslator) {
                    setLocale(locale, getLocale().fallbackLocale)
                }
            }, {flush: 'sync'})
            : null
        const stopFallbackWatcher = fallbackRef
            ? watch(fallbackRef, (fallbackLocale) => {
                if (!syncingFromTranslator) {
                    setLocale(getLocale().locale, fallbackLocale)
                }
            }, {flush: 'sync'})
            : null

        app.onUnmount?.(() => {
            stopLocaleWatcher?.()
            stopFallbackWatcher?.()
            stopLocaleSubscription()
        })

        app.provide('__', translate)
        app.provide('t', translate)
        app.provide('trans', translate)
        app.provide('trans_choice', translateChoice)
        app.provide('transChoice', translateChoice)

        app.config.globalProperties.__ = translate
        app.config.globalProperties.t = translate
        app.config.globalProperties.trans = translate
        app.config.globalProperties.trans_choice = translateChoice
        app.config.globalProperties.transChoice = translateChoice

        return app
    },
}

declare module 'vue' {
    interface ComponentCustomProperties {
        trans: typeof translate
        transChoice: typeof translateChoice
        __: typeof translate
        t: typeof translate
        trans_choice: typeof translateChoice
    }
}
