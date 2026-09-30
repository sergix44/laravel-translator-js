import assert from 'node:assert/strict'
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {performance} from 'node:perf_hooks'
import {translator} from '../dist/translator.js'
import {exportTranslations} from '../dist/exporter.js'

const median = (samples) => [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)]
const mib = (bytes) => Number((bytes / 1024 / 1024).toFixed(2))
const iterations = 50_000
const rounds = 7
const labels = Array.from({length: 64}, (_, index) => `key${index}`)
const entries = Object.fromEntries(labels.map((key) => [key, `Translation ${key}`]))
const translations = {
    en: {
        php: {messages: {
            ...entries,
            nested: {...entries},
            greeting: 'Hello :name',
            items: 'One item|:count items',
        }},
        json: {
            ...Object.fromEntries(labels.map((key) => [`screen.${key}`, `JSON ${key}`])),
            nested: {...entries},
        },
    },
    es: {php: {messages: {title: 'Título'}}},
    json_only: {json: {...entries}},
}
const config = (locale, fallbackLocale = null) => ({locale, fallbackLocale, translations})
const phpKeys = labels.map((key) => `messages.${key}`)
const nestedKeys = labels.map((key) => `messages.nested.${key}`)
const missingKeys = labels.map((key) => `missing.${key}.value`)
const lookups = [
    ['PHP hit', phpKeys, config('en'), {}, false],
    ['Nested PHP hit', nestedKeys, config('en'), {}, false],
    ['Literal JSON hit', labels.map((key) => `screen.${key}`), config('en'), {}, false],
    ['Nested JSON hit', labels.map((key) => `nested.${key}`), config('en'), {}, false],
    ['JSON-only locale', labels, config('json_only'), {}, false],
    ['Missing key', missingKeys, config('en'), {}, false],
    ['Missing locale', phpKeys, config('absent', 'en'), {}, false],
    ['Fallback', nestedKeys, config('es', 'en'), {}, false],
    ['Replacement', ['messages.greeting'], config('en'), {name: 'Sergio'}, false],
    ['Plural', ['messages.items'], config('en'), {count: 5}, true],
]

console.log(`Node ${process.version} (${process.platform}/${process.arch}); ${rounds} lookup rounds of ${iterations} calls`)
let checksum = 0
const lookupResults = lookups.map(([name, keys, settings, replace, pluralize]) => {
    const run = (count) => {
        for (let index = 0; index < count; index++) {
            checksum += translator(keys[index % keys.length], replace, pluralize, settings).length
        }
    }

    run(20_000)
    const times = []
    for (let round = 0; round < rounds; round++) {
        global.gc?.()
        const start = performance.now()
        run(iterations)
        times.push((performance.now() - start) * 1000 / iterations)
    }

    return {lookup: name, 'median µs/call': Number(median(times).toFixed(3))}
})
console.table(lookupResults)
console.log(`Lookup checksum: ${checksum}`)

const scratch = mkdtempSync(path.join(tmpdir(), 'laravel-translator-benchmark-'))

const phpSource = (keys) => '<?php return [' + Array.from({length: keys}, (_, index) =>
    `'key${index}' => 'Translation key${index}',`).join('\n') + '];'

const measureExport = (name, langPath, keyCount) => {
    exportTranslations(langPath)
    const samples = Array.from({length: 3}, () => {
        global.gc?.()
        const before = process.memoryUsage().heapUsed
        const start = performance.now()
        const catalogue = exportTranslations(langPath)
        const ms = performance.now() - start
        const heap = process.memoryUsage().heapUsed - before
        let retained
        if (global.gc) {
            global.gc()
            retained = process.memoryUsage().heapUsed - before
        }

        // Keep the result alive through memory sampling and verify every export.
        const actualKeys = Object.values(catalogue).reduce((total, locale) => total
            + Object.values(locale.php).reduce((count, group) => count + Object.keys(group).length, 0), 0)
        assert.equal(actualKeys, keyCount)
        return {ms, heap, retained}
    })

    return {
        export: name,
        'median ms': Number(median(samples.map((sample) => sample.ms)).toFixed(2)),
        'heap delta MiB': mib(median(samples.map((sample) => sample.heap))),
        'retained delta MiB': global.gc ? mib(median(samples.map((sample) => sample.retained))) : 'GC disabled',
    }
}

try {
    const singleFile = path.join(scratch, 'single-file')
    mkdirSync(path.join(singleFile, 'en'), {recursive: true})
    const results = []
    for (const keys of [100, 500, 2_000, 5_000]) {
        writeFileSync(path.join(singleFile, 'en', 'messages.php'), phpSource(keys))
        results.push(measureExport(`1 file, ${keys} keys`, singleFile, keys))
    }

    const manyFiles = path.join(scratch, 'many-files')
    for (let locale = 0; locale < 10; locale++) {
        const directory = path.join(manyFiles, `locale${locale}`)
        mkdirSync(directory, {recursive: true})
        for (let file = 0; file < 20; file++) {
            writeFileSync(path.join(directory, `group${file}.php`), phpSource(100))
        }
    }
    results.push(measureExport('200 files, 20,000 keys', manyFiles, 20_000))
    console.table(results)
    console.log('Heap deltas are sampled, not peak memory. Retained deltas include the live catalogue and parser state.')
    console.log('Results are local synthetic measurements; compare on the same machine and Node version.')
} finally {
    rmSync(scratch, {recursive: true, force: true})
}
