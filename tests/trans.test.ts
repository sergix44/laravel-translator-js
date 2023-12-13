import {expect, test} from "vitest";
import {trans} from "../src";

test('trans works with random key', async () => {
    const r = trans('random.key')

    expect(r).toBe('random.key')
})

test('trans works with a key that exists', async () => {
    const r = trans('auth.failed')

    expect(r).toBe('These credentials do not match our records.')
})

test('trans works with a key that exists nested', async () => {
    const r = trans('domain.car.is_electric')

    expect(r).toBe('Electric')
})



