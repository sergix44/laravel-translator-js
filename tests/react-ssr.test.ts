// @vitest-environment node
import {createElement as h} from 'react'
import {renderToString} from 'react-dom/server'
import {afterEach, expect, test} from 'vitest'
import {setLocale} from '../src'
import {useTranslation, useTranslationChoice, useTranslator} from '../src/react'

afterEach(() => setLocale('en', null))

const Greeting = () => {
    const {__, locale, fallbackLocale} = useTranslator()
    const greeting = useTranslation('Welcome, :name!', {name: 'John'})
    const count = useTranslationChoice('{1} :count minute ago|[2,*] :count minutes ago', 2)
    return h('p', null, `${locale}|${fallbackLocale ?? ''}|${__('Welcome!')}|${greeting}|${count}`)
}

test('React hooks render on the server without a document or provider', () => {
    expect(typeof document).toBe('undefined')
    expect(renderToString(h(Greeting))).toBe('<p>en||Wecome!|Welcome, John!|2 minutes ago</p>')
})

test('server rendering uses the current core locale and fallback', () => {
    setLocale('fr', 'pt')
    expect(renderToString(h(Greeting))).toBe('<p>fr|pt|Bem-vindo!|Bem-vindo, John!|há 2 minutos</p>')
})
