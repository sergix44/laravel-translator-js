// @vitest-environment node
import {execFile as execFileCallback} from 'node:child_process'
import {mkdtemp, mkdir, readFile, rm, symlink, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {test} from 'vitest'

const execFile = promisify(execFileCallback)
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

test('published React exports share locale and catalogue state with the core in both module formats', async () => {
    const consumer = await mkdtemp(path.join(tmpdir(), 'laravel-translator-react-package-'))
    try {
        const packageJson = await readFile(path.join(packageRoot, 'package.json'), 'utf8')
        await writeFile(path.join(consumer, 'package.json'), packageJson)
        await execFile('npm', ['run', 'build', '--', '--out-dir', path.join(consumer, 'dist')], {
            cwd: packageRoot,
            env: {...process.env, npm_config_cache: path.join(consumer, 'npm-cache')},
        })

        const modules = path.join(consumer, 'node_modules')
        const virtualModule = path.join(modules, 'virtual-laravel-translations')
        await mkdir(virtualModule, {recursive: true})
        for (const dependency of ['react', 'react-dom']) {
            await symlink(path.join(packageRoot, 'node_modules', dependency), path.join(modules, dependency), 'dir')
        }
        await writeFile(path.join(virtualModule, 'package.json'), JSON.stringify({
            type: 'module', exports: {import: './index.js', require: './index.cjs'},
        }))
        const translations = JSON.stringify({
            en: {json: {Welcome: 'English'}}, pt: {json: {Welcome: 'Portuguese'}},
        })
        await writeFile(path.join(virtualModule, 'index.js'),
            `export default ${translations}; export const onTranslationsUpdate = () => () => {};`)
        await writeFile(path.join(virtualModule, 'index.cjs'),
            `module.exports = ${translations}; module.exports.onTranslationsUpdate = () => () => {};`)

        const checks = `
            const Greeting = () => React.createElement('p', null, useTranslator().__('Welcome'))
            core.setLocale('pt')
            assert.equal(renderToString(React.createElement(Greeting)), '<p>Portuguese</p>')
            setTranslations({pt: {json: {Welcome: 'Updated'}}})
            assert.equal(renderToString(React.createElement(Greeting)), '<p>Updated</p>')
        `
        await execFile(process.execPath, ['--input-type=module', '--eval', `
            import assert from 'node:assert/strict'
            import React from 'react'
            import {renderToString} from 'react-dom/server'
            import * as core from 'laravel-translator'
            import {useTranslator} from 'laravel-translator/react'
            import {setTranslations} from 'laravel-translator/catalogue'
            ${checks}
        `], {cwd: consumer})
        await execFile(process.execPath, ['--input-type=commonjs', '--eval', `
            const assert = require('node:assert/strict')
            const React = require('react')
            const {renderToString} = require('react-dom/server')
            const core = require('laravel-translator')
            const {useTranslator} = require('laravel-translator/react')
            const {setTranslations} = require('laravel-translator/catalogue')
            ${checks}
        `], {cwd: consumer})
    } finally {
        await rm(consumer, {recursive: true, force: true})
    }
}, 15_000)
