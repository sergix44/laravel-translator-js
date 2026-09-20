import {onInvalidate} from './reactivity'
import type {TranslationHandle, TranslationValue} from './handle'

export type Disposer = () => void

/**
 * Run `fn` now and again after every locale change. Returns a disposer.
 *
 * This replaces hand-rolling `onLocaleChange(render); render()`.
 */
export const effect = (fn: () => void): Disposer => {
    fn()

    return onInvalidate(fn)
}

export interface BindTarget {
    /** Write to this attribute instead of the element's text. */
    attr?: string
    /** Write to this property instead of the element's text. */
    prop?: string
}

const asString = (value: TranslationValue) =>
    typeof value === 'string' ? value : JSON.stringify(value)

/**
 * Keep part of the DOM in sync with a translation. Returns a disposer.
 *
 *   bind(document.querySelector('#title'), trans('page.title'))
 *   bind(input, trans('form.email'), {attr: 'placeholder'})
 */
export const bind = (
    el: Element,
    handle: TranslationHandle,
    target: BindTarget = {},
): Disposer =>
    handle.subscribe((value) => {
        const text = asString(value)

        if (target.attr) {
            el.setAttribute(target.attr, text)
        } else if (target.prop) {
            (el as unknown as Record<string, unknown>)[target.prop] = text
        } else {
            el.textContent = text
        }
    })

/** Dispose several bindings at once. */
export const disposeAll = (...disposers: Disposer[]): Disposer => () => {
    disposers.forEach((dispose) => dispose())
}
