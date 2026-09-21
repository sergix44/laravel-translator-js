import {shared, type LocaleState, type ReactivityAdapter} from './shared'

export type {ReactivityAdapter} from './shared'
export type LocaleChangeListener = (state: Readonly<LocaleState>) => void

const safely = (fn: () => void) => {
    try {
        fn()
    } catch (error) {
        // One misbehaving subscriber must not stop the rest from being notified.
        console.error('[laravel-translator] a reactivity subscriber threw', error)
    }
}

/**
 * Teach the translator how to talk to a framework's reactivity system.
 *
 * Pull-based frameworks (Vue, Solid, Preact signals) register an adapter whose `track`
 * reads one of their reactive primitives and whose `trigger` bumps it. That is all it
 * takes to make every `trans()` read in that framework reactive.
 *
 * Returns a function that unregisters the adapter.
 */
export const registerReactivityAdapter = (adapter: ReactivityAdapter) => {
    shared.adapters.add(adapter)

    return () => {
        shared.adapters.delete(adapter)
    }
}

/** Monotonic counter used to memoize handle reads. Bumped once per invalidation. */
export const getVersion = () => shared.version

/** Called by every handle read, before the memo check. */
export const track = () => {
    // This is the hottest reactivity path. Avoid allocating a closure per adapter/read.
    for (const adapter of shared.adapters) {
        try {
            adapter.track()
        } catch (error) {
            console.error('[laravel-translator] a reactivity adapter threw while tracking', error)
        }
    }
}

/** Push-style subscription used by React, Svelte and the vanilla helpers. */
export const onInvalidate = (listener: () => void) => {
    shared.listeners.add(listener)

    return () => {
        shared.listeners.delete(listener)
    }
}

/** Observe locale changes without also receiving translation-catalogue updates. */
export const onLocaleChange = (listener: LocaleChangeListener) => {
    shared.localeListeners.add(listener)

    return () => {
        shared.localeListeners.delete(listener)
    }
}

/** Invalidate every handle and notify every framework. Order matters. */
export const invalidate = (localeChanged = false) => {
    shared.version++

    // Iterate copies: a listener may subscribe or unsubscribe from inside its own
    // callback, and Set.forEach would otherwise visit entries added mid-iteration.
    Array.from(shared.adapters).forEach((adapter) => safely(() => adapter.trigger()))
    Array.from(shared.listeners).forEach(safely)

    if (localeChanged) {
        Array.from(shared.localeListeners).forEach((listener) =>
            safely(() => listener(shared.snapshot)),
        )
    }
}
