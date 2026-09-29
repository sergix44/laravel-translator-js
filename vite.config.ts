/// <reference types="vitest" />
import {defineConfig} from 'vite'
import {svelte} from '@sveltejs/vite-plugin-svelte'
import laravelTranslator from "./src/vite";

export default defineConfig({
    plugins: [
        laravelTranslator({langPath: 'tests/fixtures/lang'}),
        svelte(),
    ],
    resolve: {
        conditions: ['browser'],
    },
    test: {
        coverage: {
            provider: 'v8',
        },
    },
})
