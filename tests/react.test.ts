// @vitest-environment jsdom
import {createElement, StrictMode} from 'react'
import {act, render, screen, cleanup} from '@testing-library/react'
import {afterEach, beforeEach, expect, test} from 'vitest'
import {getLocale, setLocale} from '../src'
import {useLocale, useTranslator} from '../src/react'

beforeEach(() => {
    setLocale('en', null)
})

afterEach(() => {
    cleanup()
})

test('getLocale returns a referentially stable snapshot', () => {
    // useSyncExternalStore compares snapshots by reference; a fresh object per call would
    // make React loop forever. This guards that invariant directly.
    expect(getLocale()).toBe(getLocale())

    const before = getLocale()
    setLocale('pt')

    expect(getLocale()).not.toBe(before)
    expect(getLocale()).toBe(getLocale())
})

test('useTranslator renders translations and updates on locale change', () => {
    const Title = () => {
        const {__} = useTranslator()

        return createElement('h1', null, __('Welcome!'))
    }

    render(createElement(Title))

    expect(screen.getByRole('heading').textContent).toBe('Wecome!')

    act(() => {
        setLocale('pt')
    })

    expect(screen.getByRole('heading').textContent).toBe('Bem-vindo!')
})

test('useTranslator works under StrictMode double-rendering', () => {
    const Title = () => {
        const {trans} = useTranslator()

        return createElement('h1', null, trans('Welcome!'))
    }

    render(createElement(StrictMode, null, createElement(Title)))

    expect(screen.getByRole('heading').textContent).toBe('Wecome!')

    act(() => {
        setLocale('pt')
    })

    expect(screen.getByRole('heading').textContent).toBe('Bem-vindo!')
})

test('useTranslator supports placeholders and pluralization', () => {
    const Component = () => {
        const {__, trans_choice} = useTranslator()

        return createElement(
            'div',
            null,
            createElement('span', {'data-testid': 'greeting'}, __('Welcome, :name!', {name: 'John'})),
            createElement('span', {'data-testid': 'cars'}, trans_choice('domain.car.car', 2)),
        )
    }

    render(createElement(Component))

    expect(screen.getByTestId('greeting').textContent).toBe('Welcome, John!')
    expect(screen.getByTestId('cars').textContent).toBe('Cars')
})

test('useLocale reports the active locale', () => {
    const Component = () => {
        const locale = useLocale()

        return createElement('span', {'data-testid': 'locale'}, locale.locale)
    }

    render(createElement(Component))

    expect(screen.getByTestId('locale').textContent).toBe('en')

    act(() => {
        setLocale('pt-BR')
    })

    expect(screen.getByTestId('locale').textContent).toBe('pt_BR')
})
