import {shared, type ReactivityAdapter} from './shared'

export type {ReactivityAdapter} from './shared'

const safely = (fn: () => void) => {
    try {
        fn()
    } catch (error) {
        // One misbehaving subscriber must not stop the rest from being notified.
        console.error('[laravel-translator] a locale change listener threw', error)
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
    shared.adapters.forEach((adapter) => safely(() => adapter.track()))
}

/** Push-style subscription used by React, Svelte and the vanilla helpers. */
export const onInvalidate = (listener: () => void) => {
    shared.listeners.add(listener)

    return () => {
        shared.listeners.delete(listener)
    }
}

/** Invalidate every handle and notify every framework. Order matters. */
export const invalidate = () => {
    shared.version++

    // Iterate copies: a listener may subscribe or unsubscribe from inside its own
    // callback, and Set.forEach would otherwise visit entries added mid-iteration.
    Array.from(shared.adapters).forEach((adapter) => safely(() => adapter.trigger()))
    Array.from(shared.listeners).forEach(safely)
}
