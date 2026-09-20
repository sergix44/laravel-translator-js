// Deliberately NOT jsdom: this must exercise the server rendering path.
import {renderToString} from 'react-dom/server'
import {beforeEach, expect, test, vi} from 'vitest'
import {setLocale} from '../src'
import {useLocale, useTranslator} from '../src/react'

beforeEach(() => {
    setLocale('en', null)
})

const Title = () => <h1>{useTranslator().__('Welcome!')}</h1>

test('renders on the server without a missing getServerSnapshot error', () => {
    // useSyncExternalStore throws "Missing getServerSnapshot" when server-rendering
    // without one, so this asserts the adapter supplies it.
    expect(renderToString(<Title/>)).toContain('Wecome!')
})

test('server rendering follows the locale set for the request', () => {
    setLocale('pt')

    expect(renderToString(<Title/>)).toContain('Bem-vindo!')
})

test('server rendering does not warn', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    renderToString(<Title/>)

    expect(error).not.toHaveBeenCalled()

    error.mockRestore()
})

test('useLocale resolves on the server', () => {
    const Locale = () => <span>{useLocale().locale}</span>

    setLocale('pt-BR')

    expect(renderToString(<Locale/>)).toContain('pt_BR')
})
