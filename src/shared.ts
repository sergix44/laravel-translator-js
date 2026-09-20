/**
 * The translator's state is a singleton, but a bundle can legitimately contain more than
 * one copy of this module: CommonJS entry points do not share chunks, a project can end up
 * with two versions in node_modules, and Vite keeps separate client and SSR module graphs.
 *
 * Anchoring the state on globalThis behind a versioned symbol means every copy talks to
 * the same store, so `setLocale()` from one import path is always visible from another.
 * The version in the key makes a future major safe to run alongside this one.
 */
export interface ReactivityAdapter {
    /** Called on every handle read, so a pull-based framework can register a dependency. */
    track(): void

    /** Called once per locale change, so a pull-based framework can invalidate. */
    trigger(): void
}

export interface LocaleState {
    locale: string
    fallbackLocale: string | null
}

export interface SharedState {
    version: number
    adapters: Set<ReactivityAdapter>
    listeners: Set<() => void>
    locale: string
    fallbackLocale: string | null
    translations: object
    snapshot: LocaleState
    initialized: boolean
}

const KEY = Symbol.for('laravel-translator@2.state')

const create = (): SharedState => ({
    version: 0,
    adapters: new Set(),
    listeners: new Set(),
    locale: 'en',
    fallbackLocale: null,
    translations: {},
    snapshot: {locale: 'en', fallbackLocale: null},
    initialized: false,
})

const container = globalThis as Record<symbol, SharedState | undefined>

export const shared: SharedState = container[KEY] ??= create()
