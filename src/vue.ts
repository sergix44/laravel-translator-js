import {computed, isRef, shallowRef, watch, type App, type ComputedRef, type Ref} from 'vue'
import {getLocale, onLocaleChange, setLocale, trans, trans_choice, type LocaleState} from './index'
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

export const useTranslation = (key: string, replace: object = {}, locale?: string): ComputedRef<string> =>
    computed(() => trans(key, replace, locale))

export const useTranslationChoice = (
    key: string,
    number: number,
    replace: object = {},
    locale?: string,
): ComputedRef<string> => computed(() => trans_choice(key, number, replace, locale))

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

        app.provide('__', trans)
        app.provide('t', trans)
        app.provide('trans', trans)
        app.provide('trans_choice', trans_choice)
        app.provide('transChoice', trans_choice)

        app.config.globalProperties.__ = trans
        app.config.globalProperties.t = trans
        app.config.globalProperties.trans = trans
        app.config.globalProperties.trans_choice = trans_choice
        app.config.globalProperties.transChoice = trans_choice

        return app
    },
}

declare module 'vue' {
    interface ComponentCustomProperties {
        trans: typeof trans
        transChoice: typeof trans_choice
        __: typeof trans
        t: typeof trans
        trans_choice: typeof trans_choice
    }
}
