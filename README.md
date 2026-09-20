<img src="https://banners.beyondco.de/Laravel%20Translator.png?theme=dark&packageManager=npm+install&packageName=-D+laravel-translator&pattern=wiggle&style=style_1&description=A+localization+bridge+for+your+frontend.&md=1&showWatermark=0&fontSize=100px&images=translate">

> Laravel Translator for Frontend

Laravel Translator is a package that allows you to use Laravel's localization features in your frontend code, with
the same syntax you would use in your backend code and zero configuration.

This package was inspired by [laravel-vue-i18n](https://github.com/xiCO2k/laravel-vue-i18n)
and [lingua](https://github.com/cyberwolf-studio/lingua).

## 🧩 Features

- Truly framework-agnostic: reactive translations in Vue, React, Svelte and plain JavaScript
- Use the same translation files you use in your backend code (both php and json files are supported)
- No extra configuration required: install, register and use
- Zero SSR configuration required
- No export step required, translations are parsed and bundled directly from your backend code by Vite
- Hot reload PHP and JSON translations without forcing a page refresh
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

## 🧑‍💻 Usage

```js
import {__, trans, t, trans_choice} from 'laravel-translator'

__('user.welcome', {name: 'John'}) // Welcome, John!
trans('auth.failed') // These credentials do not match our records.
trans_choice('user.count', 2) // Users
```

### Translations are live

`trans()` does not return a plain string. It returns a small **handle** that re-reads the
current locale every time you look at it, so calling `setLocale()` updates everything that
is already on screen.

The rule: **anywhere JavaScript expects a string, a handle just works.** When you need a
real string, read `.value`.

```js
const message = trans('auth.failed')

`${message}`                      // ✅ interpolation
String(message)                   // ✅ explicit coercion
el.textContent = message          // ✅ DOM assignment
JSON.stringify({error: message})  // ✅ serializes to the translation
message.value                     // ✅ the string itself

message.toUpperCase()             // ❌ not a string — use message.value.toUpperCase()
message === 'foo'                 // ❌ always false — compare message.value
```

To observe changes directly, subscribe. The callback fires immediately with the current
value, then again whenever it actually changes:

```js
const unsubscribe = trans('page.title').subscribe((title) => console.log(title))
```

### Changing the locale

```js
import {setLocale} from 'laravel-translator'

setLocale('it')       // switch locale, keep the current fallback
setLocale('it', 'en') // switch both
setLocale('it', null) // switch locale, clear the fallback
```

### Vue

Import the translation functions from the Vue entry point:

```html
<script setup>
import {__, t, trans, trans_choice} from 'laravel-translator/vue'
</script>

<template>
    <h1>{{ __('page.title') }}</h1>
    <p>{{ trans_choice('user.count', 2) }}</p>
    <input :placeholder="t('form.email')">
</template>
```

These return **plain strings**, so they drop straight into props typed as `string`,
including third-party components:

```html
<Head :title="__('settings.title')"/>
<HeadingSmall :title="__('settings.langtime.title')"/>
```

They are still fully reactive. The locale dependency is registered while the function runs,
so any template, `computed` or `watchEffect` that calls one re-runs when the locale
changes. Importing this module is also what installs the Vue adapter — there is no plugin
to register.

The one thing to watch: a translation read *outside* a reactive context is a plain string
and stays frozen, because nothing re-runs to refresh it. Wrap it in `computed`:

```js
const title = __('page.title')              // ❌ frozen at the current locale
const title = computed(() => __('page.title')) // ✅ stays live
```

To drive the locale from a ref, or to show the active one:

```js
import {setLocale, useLocale} from 'laravel-translator/vue'

setLocale('it')

// Given a ref, setLocale also keeps the two in sync, so later writes to the
// ref change the locale as well. It returns a function that stops watching.
const locale = ref('it')
const stop = setLocale(locale)

const current = useLocale() // computed<{locale, fallbackLocale}>
```

<details>
<summary>Using the framework-agnostic handle in Vue</summary>

`trans()` from `laravel-translator` returns a handle rather than a string. It works in Vue
too, and has the advantage that it can be hoisted into `<script setup>` and stay live:

```html
<script setup>
import {trans} from 'laravel-translator'

const title = trans('page.title')
</script>

<template>
    <h1>{{ title }}</h1>
</template>
```

Two caveats make the string functions above the better default:

- A handle is not a `string`, so it fails to type-check against props declared as `string`.
- Vue diffs props by reference. A handle hoisted into `<script setup>` is the same object
  on every render, so `:placeholder="title"` never updates. Use `title.value` there.

</details>

### React

React cannot render the handle object directly, so the hook hands you plain strings:

```jsx
import {useTranslator, useLocale} from 'laravel-translator/react'

function Page() {
    const {__, trans_choice} = useTranslator()

    return (
        <>
            <h1>{__('page.title')}</h1>
            <p>{__('Welcome, :name!', {name: 'John'})}</p>
            <p>{trans_choice('user.count', 2)}</p>
        </>
    )
}

function LocaleBadge() {
    const {locale} = useLocale()

    return <span>{locale}</span>
}
```

Components re-render automatically when `setLocale()` is called.

### Svelte

Import the translate store and use it with the `$` prefix:

```html
<script>
    import {__, trans_choice, locale} from 'laravel-translator/svelte'
</script>

<h1>{$__('page.title')}</h1>
<p>{$__('Welcome, :name!', {name: 'John'})}</p>
<p>{$trans_choice('user.count', 2)}</p>

<select bind:value={$locale}>
    <option value="en">English</option>
    <option value="it">Italiano</option>
</select>
```

> The `$` must be on the store identifier, not the call. Write `{$__('key')}`, not
> `{__('key')}` — the latter renders once and never updates.

A handle is itself a Svelte store, so you can also hold one and use `$` on it directly:

```html
<script>
    import {trans} from 'laravel-translator'

    const title = trans('page.title')
</script>

<h1>{$title}</h1>
```

`fallbackLocale` and `localeState` are available alongside `locale` when you need them.

### Plain JavaScript

```js
import {trans} from 'laravel-translator'
import {bind, effect} from 'laravel-translator/vanilla'

// Keep a node in sync. Returns a disposer.
const stop = bind(document.querySelector('#page-title'), trans('page.title'))

// Bind an attribute or a property instead of the text.
bind(emailInput, trans('form.email'), {attr: 'placeholder'})

// Or run any code on every locale change.
effect(() => console.log('locale changed'))
```

### Writing your own adapter

Any framework with a reactive primitive can be wired up in a few lines. `track()` runs on
every translation read, `trigger()` once per locale change:

```js
import {registerReactivityAdapter} from 'laravel-translator'
import {signal} from '@preact/signals-core'

const version = signal(0)

registerReactivityAdapter({
    track: () => { version.value },
    trigger: () => { version.value++ },
})
```

### Additional translation paths

You can add additional paths where to look for translation files on the Vite plugin options:

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

## ⬆️ Migrating from 1.x

| | 1.x | 2.0 |
| --- | --- | --- |
| Return type | `trans('a.b')` → `string` | `trans('a.b')` → live handle |
| Getting the string | `trans('a.b')` | `trans('a.b').value`, or any string coercion |
| String methods | `trans('a.b').toUpperCase()` | `trans('a.b').value.toUpperCase()` |
| Strict equality | `trans('a.b') === 'x'` | `trans('a.b').value === 'x'` |
| Subtree lookups | `trans('a.b') as Object` | `trans('a.b').value` |
| Vue setup | `app.use(LaravelTranslatorVue, {locale})` | `import 'laravel-translator/vue'` |
| Vue ref locale | `app.use(..., {locale: someRef})` | `setLocale(someRef)` from `laravel-translator/vue` |
| Vue templates | globals from the plugin | import `__`/`t`/`trans` from `laravel-translator/vue` |
| React | not supported | `laravel-translator/react` |
| Svelte | `{__('x')}` (never updated) | `{$__('x')}` from `laravel-translator/svelte` |
| Plain JS | manual `onLocaleChange` + re-render | `bind()` / `effect()` from `laravel-translator/vanilla` |
| `setLocale('it')` | silently cleared the fallback | preserves it; pass `null` to clear |

`LaravelTranslatorVue` has been removed, along with the global `provide`/`globalProperties`
registrations and the `ComponentCustomProperties` type augmentation it installed.

## ⚙️ How it works

This package uses [Vite](https://vitejs.dev/) Virtual Modules feature to parse your translations files and make them
available in your frontend code, without the need to export them to a separate file.

In development mode, the translations are parsed and bundled on the fly. When a PHP or JSON translation file changes,
Vite updates the affected frontend modules while preserving the current application state.

In production mode, the translations are parsed and bundled automatically when you run `npm run build`.

## ⚖️ License

The MIT License (MIT). Please see [License File](LICENSE) for more information.

## 🏅 Credits

- [Sergio Brighenti](https://github.com/sergix44/)
- [All Contributors](https://github.com/sergix44/laravel-translator-js/contributors)
