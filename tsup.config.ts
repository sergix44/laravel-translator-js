import {defineConfig} from 'tsup'

export default defineConfig({
    // Explicit entries: pointing tsup at ./src would also publish internal modules
    // (store, handle, reactivity, shared, translator, pluralizer) as public subpaths.
    entry: [
        'src/index.ts',
        'src/vite.ts',
        'src/vue.ts',
        'src/react.ts',
        'src/svelte.ts',
        'src/vanilla.ts',
    ],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    target: 'es2020',
    sourcemap: true,
    // tsup defaults CJS splitting to false, which makes every adapter entry inline its own
    // copy of the store. The globalThis anchor in src/shared.ts makes that harmless, but
    // sharing chunks keeps the bundles small.
    splitting: true,
    // treeshake routes the build through rollup and bypasses tsup's CJS splitting plugin.
    treeshake: false,
    // vue / react / svelte / vite / glob / php-parser are externalised automatically from
    // dependencies + peerDependencies.
    external: ['virtual-laravel-translations'],
})
