// @vitest-environment jsdom
import {StrictMode, memo} from 'react'
import {act, cleanup, render, screen} from '@testing-library/react'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import initialTranslations from 'virtual-laravel-translations'
import {getLocale, setLocale, setTranslations, trans} from '../src'
import {useLocale, useTranslator} from '../src/react'

beforeEach(() => {
    setTranslations(initialTranslations)
    setLocale('en', null)
})

afterEach(() => {
    cleanup()
})

test('getLocale returns a referentially stable snapshot', () => {
    // useSyncExternalStore compares snapshots by reference. A fresh object per call would
    // make React re-render forever, so this invariant is the adapter's foundation.
    expect(getLocale()).toBe(getLocale())

    const before = getLocale()
    setLocale('pt')

    expect(getLocale()).not.toBe(before)
    expect(getLocale()).toBe(getLocale())
})

test('useSyncExternalStore does not warn that the snapshot is uncached', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    const Title = () => <h1>{useTranslator().__('Welcome!')}</h1>
    render(<Title/>)
    act(() => setLocale('pt'))

    expect(error).not.toHaveBeenCalledWith(
        expect.stringContaining('getSnapshot should be cached'),
        ...([] as unknown[]),
    )

    error.mockRestore()
})

test('useTranslator renders translations and updates on locale change', () => {
    const Title = () => <h1>{useTranslator().__('Welcome!')}</h1>

    render(<Title/>)

    expect(screen.getByRole('heading').textContent).toBe('Wecome!')

    act(() => setLocale('pt'))

    expect(screen.getByRole('heading').textContent).toBe('Bem-vindo!')
})

test('useTranslator updates when the catalogue changes without changing locale', () => {
    const Title = () => <h1>{useTranslator().__('Welcome!')}</h1>

    render(<Title/>)

    act(() => setTranslations({
        en: {json: {'Welcome!': 'Updated without a reload'}},
    }))

    expect(screen.getByRole('heading').textContent).toBe('Updated without a reload')
    expect(getLocale().locale).toBe('en')
})

test('useTranslator works under StrictMode double-rendering', () => {
    const Title = () => <h1>{useTranslator().trans('Welcome!')}</h1>

    render(<StrictMode><Title/></StrictMode>)

    expect(screen.getByRole('heading').textContent).toBe('Wecome!')

    act(() => setLocale('pt'))

    expect(screen.getByRole('heading').textContent).toBe('Bem-vindo!')
})

test('useTranslator supports placeholders and pluralization', () => {
    const Component = () => {
        const {__, trans_choice} = useTranslator()

        return (
            <div>
                <span data-testid="greeting">{__('Welcome, :name!', {name: 'John'})}</span>
                <span data-testid="cars">{trans_choice('domain.car.car', 2)}</span>
            </div>
        )
    }

    render(<Component/>)

    expect(screen.getByTestId('greeting').textContent).toBe('Welcome, John!')
    expect(screen.getByTestId('cars').textContent).toBe('Cars')
})

test('translations bound to DOM attributes update too', () => {
    const Form = () => <input data-testid="email" placeholder={useTranslator().__('Welcome!')}/>

    render(<Form/>)

    expect(screen.getByTestId('email').getAttribute('placeholder')).toBe('Wecome!')

    act(() => setLocale('pt'))

    expect(screen.getByTestId('email').getAttribute('placeholder')).toBe('Bem-vindo!')
})

test('useLocale reports the active locale', () => {
    const Component = () => <span data-testid="locale">{useLocale().locale}</span>

    render(<Component/>)

    expect(screen.getByTestId('locale').textContent).toBe('en')

    act(() => setLocale('pt-BR'))

    expect(screen.getByTestId('locale').textContent).toBe('pt_BR')
})

test('a locale-only consumer does not re-render for catalogue updates', () => {
    let renders = 0
    const Locale = () => {
        renders++

        return <span>{useLocale().locale}</span>
    }

    render(<Locale/>)
    act(() => setTranslations(structuredClone(initialTranslations)))

    expect(renders).toBe(1)
})

test('an explicit locale pins the translation', () => {
    const Component = () => <span data-testid="pinned">{useTranslator().__('Welcome!', {}, 'pt')}</span>

    render(<Component/>)

    expect(screen.getByTestId('pinned').textContent).toBe('Bem-vindo!')

    act(() => setLocale('en'))

    expect(screen.getByTestId('pinned').textContent).toBe('Bem-vindo!')
})

test('rendering a raw handle as a React child throws', () => {
    // This is why the hooks hand back plain strings: React never coerces objects, so
    // Symbol.toPrimitive does not help here.
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Broken = () => <h1>{trans('Welcome!') as never}</h1>

    expect(() => render(<Broken/>)).toThrow(/Objects are not valid as a React child/)

    error.mockRestore()
})

test('a memoized child re-renders because the bound string changes', () => {
    let childRenders = 0
    const Label = memo(({label}: { label: string }) => {
        childRenders++

        return <span data-testid="label">{label}</span>
    })
    const Parent = () => <Label label={useTranslator().__('Welcome!')}/>

    render(<Parent/>)

    expect(screen.getByTestId('label').textContent).toBe('Wecome!')
    expect(childRenders).toBe(1)

    act(() => setLocale('pt'))

    expect(screen.getByTestId('label').textContent).toBe('Bem-vindo!')
    expect(childRenders).toBe(2)
})
