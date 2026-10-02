<img src="https://banners.beyondco.de/Laravel%20Translator.png?theme=dark&packageManager=npm+install&packageName=-D+laravel-translator&pattern=wiggle&style=style_1&description=A+localization+bridge+for+your+frontend.&md=1&showWatermark=0&fontSize=100px&images=translate">

> Laravel Translator for Frontend

Laravel Translator is a package that allows you to use Laravel's localization features in your frontend code, with
the same syntax you would use in your backend code and zero configuration.

This package was inspired by [laravel-vue-i18n](https://github.com/xiCO2k/laravel-vue-i18n)
and [lingua](https://github.com/cyberwolf-studio/lingua).

## 🧩 Features

- Frontend framework-agnostic, works with any framework or even plain javascript (and even without Laravel)
- Use the same translation files you use in your backend code (both php and json files are supported)
- No extra configuration required: install, register and use
- Zero SSR configuration required
- No export step required, translations are parsed and bundled directly from your backend code by Vite
- Support for hot reloading
- Minimal and lightweight

## 🚀 Installation

*ViteJS is required to use this package.*
Install the package via npm or yarn:

```bash
npm install -D laravel-translator
```

In your `vite.config.js` file, register the plugin:

```js
import {defineConfig} from 'vite'
import laravelTranslator from 'laravel-translator/vite'

export default defineConfig({
    plugins: [
        // ...
        laravelTranslator()
    ]
})
```

Run `npm run dev` to start the development server, or `npm run build` to build your assets for production.

Set the language and fallback language on the `html` element in your `app.blade.php` file:

```html
<html lang="{{ app()->getLocale() }}" data-fallback-lang="{{ config('app.fallback_locale') }}">
```

Both attributes are optional. Without `lang`, the locale defaults to `en`; without `data-fallback-lang`, no fallback locale is used. Changing either attribute later updates translations in mounted React, Vue, and Svelte components.

## 🧑‍💻Usage

You can import the usual Laravel translation functions from the `laravel-translator` package:

```js
import {__, trans, t, trans_choice} from 'laravel-translator'

__('user.welcome', {name: 'John'}) // Welcome, John!
trans('auth.failed') // These credentials do not match our records.
t('auth.failed') // ...

trans_choice('user.count', 1) // User
trans_choice('user.count', 2) // Users
```
### Vue

Register the plugin without options to use the `html` attributes:

```js
import {createApp} from 'vue'
import App from './App.vue'
import {LaravelTranslatorVue} from 'laravel-translator/vue'

createApp(App).use(LaravelTranslatorVue).mount('#app')
```

You can still pass a locale string or writable Vue refs as options when managing locale in Vue. The plugin provides `__`, `t`, `trans`, `trans_choice`, and `transChoice` to component templates and through Vue injection. Changing the `html` attributes or calling `setLocale` from `laravel-translator` updates rendered translations:

```html
<template>
    <h1>{{ __('page.title') }}</h1>
    <p>{{ trans('page.content') }}</p>
    <p>{{ trans_choice('cart.items', count) }}</p>
</template>
```

In `<script setup>`, import `trans`, `trans_choice`, or their aliases `__`, `t`, and `transChoice` from `laravel-translator/vue`. These helpers return strings. Calls in templates, render functions, and `computed()` track locale and translation file changes automatically, including when passing strings to third-party component props:

```html
<script setup>
import {trans, trans_choice} from 'laravel-translator/vue'

const props = defineProps({count: Number})
</script>

<template>
    <section>
        <h1>{{ trans('page.title') }}</h1>
        <ThirdPartyButton :label="trans('actions.save')" />
        <p>{{ trans_choice('cart.items', props.count) }}</p>
    </section>
</template>
```

A string assigned once in setup, such as `const title = trans('page.title')`, is a snapshot. For a stored reactive translation, use `computed(() => trans('page.title'))` or the `use_trans` and `use_trans_choice` composables:

```html
<script setup>
import {use_trans, use_trans_choice} from 'laravel-translator/vue'

const props = defineProps({count: Number})
const title = use_trans('page.title')
const items = use_trans_choice('cart.items', () => props.count)
</script>

<template>
    <section>
        <h1>{{ title }}</h1>
        <p>{{ items }}</p>
    </section>
</template>
```

`___` is an alias for `use_trans`, so `___('page.title')` also returns a reactive translation. The previous names `useTranslation` and `useTranslationChoice` remain available as aliases.

The composables return read-only computed refs. Vue unwraps them in templates; use `.value` in JavaScript. Their arguments accept plain values, Vue refs, or getters. Pass a ref or getter for values that may change, such as a count or replacements derived from props.

The plugin's template and injected helpers also return strings.

### Svelte

Import the Svelte stores and use the `$` prefix in templates. Svelte subscribes to each store and updates rendered text, attributes, and component props when `setLocale` is called or translation files change during development.

```svelte
<script>
    import {trans, trans_choice, locale} from 'laravel-translator/svelte'
</script>

<h1>{$trans('page.title')}</h1>
<p>{$trans_choice('cart.items', 2)}</p>

<select bind:value={$locale}>
    <option value="en">English</option>
    <option value="it">Italiano</option>
</select>
```

For translations assigned in a Svelte 5 script, use `$derived` so they also follow prop changes:

```svelte
<script>
    import {trans, trans_choice} from 'laravel-translator/svelte'

    let {count} = $props()
    const title = $derived($trans('page.title'))
    const items = $derived($trans_choice('cart.items', count))
</script>

<h1>{title}</h1>
<p>{items}</p>
```

`__` and `t` are aliases for the `trans` store; `transChoice` is an alias for `trans_choice`.

For an individual reactive string store, use `use_trans(key, replace?, locale?)` or `use_trans_choice(key, count, replace?, locale?)`. `___` aliases `use_trans`:

```svelte
<script>
    import {___, use_trans_choice} from 'laravel-translator/svelte'

    let {count} = $props()
    const title = ___('page.title')
    const items = $derived(use_trans_choice('cart.items', count))
</script>

<h1>{$title}</h1>
<p>{$items}</p>
```

These stores update on locale and catalogue changes. Arguments are plain values; use `$derived` to recreate the store when props change in Svelte 5 (or a `$:` assignment in legacy components). `$title` and `$items` are strings and can be passed directly to component props.

The `locale` and `fallbackLocale` stores also follow changes to the `html` attributes and calls to `setLocale` from `laravel-translator`. Import plain translation functions from `laravel-translator` for use outside Svelte templates.

### React

For React 18 and 19, import `useTranslator` from `laravel-translator/react`. The hook returns `__`, `t`, `trans`, `trans_choice`, `transChoice`, `locale`, `fallbackLocale`, and `setLocale`. No provider is required.

```jsx
import {useTranslator} from 'laravel-translator/react'

export default function Cart({count}) {
    const {trans, trans_choice, locale, fallbackLocale, setLocale} = useTranslator()

    return (
        <>
            <h1>{trans('page.title')}</h1>
            <p>{trans_choice('cart.items', count)}</p>
            <select value={locale} onChange={(event) => setLocale(event.target.value, fallbackLocale)}>
                <option value="en">English</option>
                <option value="it">Italiano</option>
            </select>
        </>
    )
}
```

Call `useTranslator()` once per component. Its `trans` and `trans_choice` helpers return strings and can be called in JSX, lists, or callbacks. Keeping the subscription in an explicitly named hook follows [React's hook naming conventions](https://react.dev/learn/reusing-logic-with-custom-hooks#hook-names-always-start-with-use).

The existing `useTranslation(key, replace?, locale?)` and `useTranslationChoice(key, count, replace?, locale?)` hooks remain available for individual strings:

```jsx
import {useTranslation, useTranslationChoice} from 'laravel-translator/react'

export default function Greeting({name, count}) {
    const greeting = useTranslation('user.welcome', {name})
    const items = useTranslationChoice('cart.items', count)

    return <p>{greeting} / {items}</p>
}
```

The React adapter also exports `use_trans`, `use_trans_choice`, and `___` as aliases for `useTranslation`, `useTranslationChoice`, and `useTranslation`, respectively. They return strings and follow the same hook rules: call them unconditionally at the top level of a component or custom hook. Prefer the existing camelCase names, or rename these imports to `useTranslation` / `useTranslationChoice`, so React tooling recognizes them as hooks. React's naming convention requires `use` followed by a capital letter.

These hooks update when the `html` locale attributes change, `setLocale` is called, or translation files change during development. Translation helpers also change identity on those updates, so memoized children and values depending on them refresh. Import plain translation functions from `laravel-translator` for use outside React components.

Server rendering is supported; initialize the same locale and fallback locale on the server and client before rendering or hydrating.


### Advanced usage

It's possible to set the locale and the fallback locale manually, by using the `setLocale` function:

```js
import {setLocale} from "laravel-translator"

setLocale('it') // Set the locale to 'it'
setLocale('it', 'en') // Set the locale to 'it' and the fallback locale to 'en'
```

You can add additional path where to look for translation files on the Vite plugin options:

```js
import {defineConfig} from 'vite'
import laravelTranslator from 'laravel-translator/vite'

export default defineConfig({
    plugins: [
        // ...
        laravelTranslator({
            langPath: 'resources/js/translations', // By default, the package looks for translations in the 'lang' folder
            additionalLangPaths: ['vendor/my-package/lang'] // You can add additional paths where to look for translations
        })
    ]
})
```

## ⚙️ How it works

This package uses [Vite](https://vitejs.dev/) Virtual Modules feature to parse your translations files and make them
available in your frontend code, without the need to export them to a separate file.

In development mode, editing a PHP or JSON translation file updates the translations without reloading the page.
React and Svelte components using their adapters and Vue templates using the registered translation helpers refresh automatically. In plain JavaScript, subscribe to
translation changes and render again when a file changes:

```js
import {onTranslationsChange, trans} from 'laravel-translator'

const render = () => {
    document.querySelector('#title').textContent = trans('page.title')
}

render()
const stop = onTranslationsChange(render) // Call stop() when the view is removed.
```

If you also use `laravel-vite-plugin`, avoid `refresh: true`: its default refresh paths include `lang/**` and
`resources/lang/**`, triggering a full page reload for translation edits. Set its `refresh` option to paths that need
a reload, such as `['resources/views/**', 'routes/**']`, and let `laravelTranslator()` handle translation files.

In production mode, the translations are parsed and bundled automatically when you run `npm run build`.

## Development

Run `npm run tests` to check behavior and `npm run benchmark` to build the package and measure translation lookups
and PHP export scaling. The benchmark creates temporary fixtures and removes them when finished.

Benchmark results report median timings and sampled heap deltas, including retained memory after garbage collection.
Compare results on the same machine and Node version; these synthetic measurements do not include browser rendering
or framework overhead, and they do not impose timing thresholds on the test suite.

## ⚖️ License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

## 🏅 Credits

- [Sergio Brighenti](https://github.com/sergix44/)
- [All Contributors](https://github.com/sergix44/laravel-translator-js/contributors)
