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

/**
 * The active locale, as a writable-compatible store.
 *
 *   <select bind:value={$locale}>
 */
export const locale = {
    subscribe(run: Subscriber<Readonly<LocaleState>>) {
        run(getLocale())

        return onInvalidate(() => run(getLocale()))
    },
    set(next: string) {
        setLocale(next)
    },
    update(updater: (state: Readonly<LocaleState>) => string) {
        setLocale(updater(getLocale()))
    },
}
