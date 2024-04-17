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

```html

<script>
    import {__} from "laravel-translator"
</script>

<h1>{__('page.title')}</h1>

<p>{__('page.content')}</p>
```

#### Vue

```html

<template>
    <div>
        <h1>{{ __('page.title') }}</h1>

        <p>{{ __('page.content') }}</p>
    </div>
</template>

<script>
    import {__} from "laravel-translator"

    // ...
</script>
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

In development mode, the translations are parsed and bundled on the fly, and hot reloaded when the files change.

In production mode, the translations are parsed and bundled automatically when you run `npm run build`.

## ⚖️ License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

## 🏅 Credits

- [Sergio Brighenti](https://github.com/sergix44/)
- [All Contributors](https://github.com/sergix44/laravel-translator-js/contributors)