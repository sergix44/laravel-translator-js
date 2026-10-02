import {onTranslationsChange} from './catalogue'
import {getLocale, onLocaleChange, setLocale, trans as translate, transChoice as translateChoice, type LocaleState} from './index'

export type Unsubscriber = () => void
export type Subscriber<T> = (value: T) => void

export interface Readable<T> {
    subscribe(run: Subscriber<T>): Unsubscriber
}

export interface Writable<T> extends Readable<T> {
    set(value: T): void
    update(updater: (value: T) => T): void
}

export type TranslateFn = (key: string, replace?: object, locale?: string) => string
export type TranslateChoiceFn = (key: string, number: number, replace?: object, locale?: string) => string

type ChangeSubscriber = (listener: () => void) => Unsubscriber

// Share one upstream listener between all components using the same store.
const sharedStore = <T>(read: () => T, subscribeToChanges: ChangeSubscriber): Readable<T> => {
    const subscribers = new Set<{run: Subscriber<T>}>()
    let current: T
    let stop: Unsubscriber | null = null

    const update = () => {
        const next = read()
        if (Object.is(next, current)) return

        current = next
        for (const subscription of [...subscribers]) {
            if (!subscribers.has(subscription)) continue
            try {
                subscription.run(current)
            } catch (error) {
                console.error('[laravel-translator] a Svelte subscriber threw', error)
            }
        }
    }

    return {
        subscribe(run) {
            if (subscribers.size === 0) {
                current = read()
                stop = subscribeToChanges(update)
            }

            const subscription = {run}
            subscribers.add(subscription)
            try {
                run(current)
            } catch (error) {
                subscribers.delete(subscription)
                if (subscribers.size === 0) {
                    stop?.()
                    stop = null
                }
                throw error
            }

            return () => {
                subscribers.delete(subscription)
                if (subscribers.size === 0) {
                    stop?.()
                    stop = null
                }
            }
        },
    }
}

const onTranslationChange: ChangeSubscriber = (notify) => {
    const stopLocale = onLocaleChange(notify)
    const stopTranslations = onTranslationsChange(notify)
    return () => {
        stopLocale()
        stopTranslations()
    }
}

// Each change creates a new function identity so Svelte invalidates expressions
// like {$__('page.title')} in both legacy and runes components.
const translationStore = <T>(build: () => T): Readable<T> => sharedStore(build, onTranslationChange)

/** Use `{$trans('page.title')}` in templates or `$derived($trans('page.title'))` in scripts. */
export const trans: Readable<TranslateFn> = translationStore(() =>
    (key, replace, locale) => translate(key, replace, locale))

export const __: Readable<TranslateFn> = trans
export const t: Readable<TranslateFn> = trans

/** Use `{$trans_choice('cart.items', count)}` in Svelte templates. */
export const trans_choice: Readable<TranslateChoiceFn> = translationStore(() =>
    (key, number, replace, locale) => translateChoice(key, number, replace, locale))

export const transChoice: Readable<TranslateChoiceFn> = trans_choice

/** A readable translated string that follows locale and catalogue changes. */
export const use_trans = (key: string, replace: object = {}, locale?: string): Readable<string> =>
    sharedStore(() => translate(key, replace, locale), onTranslationChange)

/** A readable pluralized string that follows locale and catalogue changes. */
export const use_trans_choice = (
    key: string,
    number: number,
    replace: object = {},
    locale?: string,
): Readable<string> => sharedStore(() => translateChoice(key, number, replace, locale), onTranslationChange)

export const ___ = use_trans

const writableLocaleStore = <T>(read: () => T, write: (value: T) => void): Writable<T> => ({
    ...sharedStore(read, onLocaleChange),
    set: write,
    update(updater) {
        write(updater(read()))
    },
})

/** The active locale; supports `<select bind:value={$locale}>`. */
export const locale: Writable<string> = writableLocaleStore(
    () => getLocale().locale,
    (next) => setLocale(next, getLocale().fallbackLocale),
)

export const fallbackLocale: Writable<string | null> = writableLocaleStore(
    () => getLocale().fallbackLocale,
    (next) => setLocale(getLocale().locale, next),
)

export const localeState: Readable<Readonly<LocaleState>> = sharedStore(getLocale, onLocaleChange)
