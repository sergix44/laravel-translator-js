/// <reference types="vitest" />
import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import laravelTranslator from "./src/vite.ts";

export default defineConfig({
    plugins: [
        laravelTranslator({
            langPath: 'tests/fixtures/lang',
        }),
        svelte({hot: false}),
    ],
    resolve: {
        // Svelte ships separate server/client builds; jsdom tests need the client one.
        conditions: ['browser'],
    },
    test: {
        coverage: {
            provider: 'v8',
        },
    },
})
