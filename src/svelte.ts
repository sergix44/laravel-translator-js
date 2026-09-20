import {onInvalidate} from './reactivity'
import {getLocale, setLocale, type LocaleState} from './store'
import {trans as baseTrans, transChoice as baseTransChoice} from './index'

/**
 * Svelte adapter.
 *
 * `{trans('x')}` is a call expression, so Svelte's `$`-auto-subscription cannot apply to
 * it. The idiomatic shape is a store whose *value is a function*, which makes
 * `{$__('page.title')}` reactive.
 *
 * These stores are hand-rolled against the store contract, so this module imports nothing
 * from `svelte` and works on both Svelte 4 and 5.
 */

export type Unsubscriber = () => void
export type Subscriber<T> = (value: T) => void

export interface Readable<T> {
    subscribe(run: Subscriber<T>): Unsubscriber
}

export type TranslateFn = (key: string, replace?: object, locale?: string) => string
export type TranslateChoiceFn = (key: string, number: number, replace?: object, locale?: string) => string

/**
 * A store whose value is a freshly-identified function on every locale change.
 *
 * The new identity matters: Svelte 5 compares store values with `===`, so re-emitting the
 * same function reference would not invalidate the template.
 */
const functionStore = <T extends Function>(build: () => T): Readable<T> => ({
    subscribe(run: Subscriber<T>) {
        run(build())

        return onInvalidate(() => run(build()))
    },
})

const buildTranslate = (): TranslateFn =>
    (key, replace, locale) => String(baseTrans(key, replace, locale))

const buildTranslateChoice = (): TranslateChoiceFn =>
    (key, number, replace, locale) => String(baseTransChoice(key, number, replace, locale))

/** `{$__('page.title')}` */
export const __: Readable<TranslateFn> = functionStore(buildTranslate)

/** `{$t('page.title')}` */
export const t: Readable<TranslateFn> = __

/** `{$trans('page.title')}` */
export const trans: Readable<TranslateFn> = __

/** `{$trans_choice('user.count', 2)}` */
export const trans_choice: Readable<TranslateChoiceFn> = functionStore(buildTranslateChoice)

/** `{$transChoice('user.count', 2)}` */
export const transChoice: Readable<TranslateChoiceFn> = trans_choice

export interface Writable<T> extends Readable<T> {
    set(value: T): void

    update(updater: (value: T) => T): void
}

const writableStore = <T>(read: () => T, write: (value: T) => void): Writable<T> => ({
    subscribe(run: Subscriber<T>) {
        run(read())

        return onInvalidate(() => run(read()))
    },
    set: write,
    update(updater) {
        write(updater(read()))
    },
})

/**
 * The active locale as a string, so it round-trips through a form control:
 *
 *   <select bind:value={$locale}>
 */
export const locale: Writable<string> = writableStore(
    () => getLocale().locale,
    (next) => setLocale(next),
)

/** The active fallback locale. */
export const fallbackLocale: Writable<string | null> = writableStore(
    () => getLocale().fallbackLocale,
    (next) => setLocale(getLocale().locale, next),
)

/** The whole locale state, for when you need both values at once. */
export const localeState: Readable<Readonly<LocaleState>> = {
    subscribe(run: Subscriber<Readonly<LocaleState>>) {
        run(getLocale())

        return onInvalidate(() => run(getLocale()))
    },
}
