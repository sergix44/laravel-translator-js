/// <reference types="vitest" />
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import laravelTranslator from "./src/vite.ts";

export default defineConfig({
    plugins: [
        laravelTranslator({
            langPath: 'tests/fixtures/lang',
        }),
        vue(),
        svelte(),
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
