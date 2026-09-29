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

Remember to set the language in your `html`, for example in your `app.blade.php` file:

```html

<html lang="{{ app()->getLocale() }}">
```

If you want to also pass the fallback locale to your frontend code, you can do so by adding the following line to your
`app.blade.php` file:

```html

<script>
    window.fallbackLocale = "{{ config('app.fallback_locale') }}"
</script>
```

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

The `locale` and `fallbackLocale` stores also follow calls to `setLocale` from `laravel-translator`. Import plain translation functions from `laravel-translator` for use outside Svelte templates.

#### Vue 3

Register the plugin with a locale string or a writable Vue ref:

```js
import {createApp, ref} from 'vue'
import App from './App.vue'
import {LaravelTranslatorVue} from 'laravel-translator/vue'

const locale = ref('en')
createApp(App).use(LaravelTranslatorVue, {locale, fallbackLocale: 'en'}).mount('#app')

locale.value = 'it' // Updates translations in every component.
```

The plugin provides `__`, `t`, `trans`, `trans_choice`, and `transChoice` to component templates and through Vue injection. Calling `setLocale` from `laravel-translator` also updates rendered translations:

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
Vue templates using the registered translation helpers refresh automatically. In plain JavaScript, subscribe to
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
