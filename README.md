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

#### React

For React 18 and 19, import `useTranslator` from `laravel-translator/react`. The hook returns `__`, `t`, `trans`, `trans_choice`, `transChoice`, `locale`, `fallbackLocale`, and `setLocale`. No provider is required.

```jsx
import {useTranslator} from 'laravel-translator/react'

export default function Cart({count}) {
    const {__, trans_choice, locale, fallbackLocale, setLocale} = useTranslator()

    return (
        <>
            <h1>{__('page.title')}</h1>
            <p>{trans_choice('cart.items', count)}</p>
            <select value={locale} onChange={(event) => setLocale(event.target.value, fallbackLocale)}>
                <option value="en">English</option>
                <option value="it">Italiano</option>
            </select>
        </>
    )
}
```

For individual strings, use `useTranslation(key, replace?, locale?)` or `useTranslationChoice(key, count, replace?, locale?)`:

```jsx
import {useTranslation, useTranslationChoice} from 'laravel-translator/react'

export default function Greeting({name, count}) {
    const greeting = useTranslation('user.welcome', {name})
    const items = useTranslationChoice('cart.items', count)

    return <p>{greeting} / {items}</p>
}
```

These hooks update when the `html` locale attributes change, `setLocale` is called, or translation files change during development. Translation helpers also change identity on those updates, so memoized children and values depending on them refresh. Import plain translation functions from `laravel-translator` for use outside React components.

Server rendering is supported; initialize the same locale and fallback locale on the server and client before rendering or hydrating.

#### Svelte

Import the Svelte stores and use the `$` prefix in templates. Svelte subscribes to each store and updates rendered text, attributes, and component props when `setLocale` is called or translation files change during development.

```svelte
<script>
    import {__, trans_choice, locale} from 'laravel-translator/svelte'
</script>

<h1>{$__('page.title')}</h1>
<p>{$trans_choice('cart.items', 2)}</p>

<select bind:value={$locale}>
    <option value="en">English</option>
    <option value="it">Italiano</option>
</select>
```

The `locale` and `fallbackLocale` stores also follow changes to the `html` attributes and calls to `setLocale` from `laravel-translator`. Import plain translation functions from `laravel-translator` for use outside Svelte templates.

#### Vue 3

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

For a translation assigned once in `<script setup>`, use a computed translation so it stays reactive:

```html
<script setup>
import {useTranslation} from 'laravel-translator/vue'

const title = useTranslation('page.title')
</script>

<template><h1>{{ title }}</h1></template>
```

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

## ⚖️ License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

## 🏅 Credits

- [Sergio Brighenti](https://github.com/sergix44/)
- [All Contributors](https://github.com/sergix44/laravel-translator-js/contributors)
