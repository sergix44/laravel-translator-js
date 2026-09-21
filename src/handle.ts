import {getVersion, onInvalidate, track} from './reactivity'
import {stringifyTranslation, type TranslationValue} from './value'

export type {TranslationValue} from './value'

/**
 * A live translation. Reading it re-evaluates against the current locale, so the value is
 * never stale. It coerces to a string everywhere JavaScript asks for one (template
 * literals, `String()`, DOM assignment, `JSON.stringify`) and satisfies the store contract
 * frameworks subscribe to.
 */
export interface TranslationHandle {
    /** The current value. A string, or an object when the key resolves to a subtree. */
    readonly value: TranslationValue

    /**
     * Observe the value. `run` is invoked immediately with the current value, then again
     * whenever it actually changes. Returns an unsubscribe function.
     */
    subscribe(run: (value: TranslationValue) => void): () => void

    toString(): string

    valueOf(): string

    toJSON(): TranslationValue

    [Symbol.toPrimitive](hint: string): string | number
}

export const createHandle = (compute: () => TranslationValue): TranslationHandle => {
    let memo: TranslationValue
    let memoVersion = -1

    const read = (): TranslationValue => {
        // Must run on every read, before the memo check, or a pull-based framework would
        // only ever register a dependency the first time this handle is read.
        track()

        const version = getVersion()
        if (memoVersion !== version) {
            memo = compute()
            memoVersion = version
        }

        return memo
    }

    const asString = () => stringifyTranslation(read())

    return {
        get value() {
            return read()
        },

        subscribe(run) {
            let last = read()

            // Svelte's store contract requires an immediate call.
            run(last)

            return onInvalidate(() => {
                const next = read()

                // Dedupe on the value, not the locale: a key that translates identically
                // in two locales should not report a change.
                if (next !== last) {
                    last = next
                    run(next)
                }
            })
        },

        // Coercion never reaches toString (Symbol.toPrimitive wins), but it must exist as
        // an own function: Vue's toDisplayString inspects `val.toString` to decide between
        // String(val) and JSON.stringify(val).
        toString: asString,

        // Must be primitive: a valueOf returning an object is a footgun.
        valueOf: asString,

        toJSON: read,

        [Symbol.toPrimitive](hint: string) {
            return hint === 'number' ? Number(asString()) : asString()
        },
    }
}
