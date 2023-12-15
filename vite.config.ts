/// <reference types="vitest" />
import {defineConfig} from 'vite'
import laravelTranslator from "./src/vite";

export default defineConfig({
    plugins: [laravelTranslator({
        langPath: 'tests/fixtures/lang',
    })],
    test: {
        coverage: {
            provider: 'v8',
        },
    },
})