import {getLocale, onLocaleChange, setLocale, trans, trans_choice} from "./index";
import {App, computed, Ref, shallowRef, watch} from "vue";
import {Config} from "./translator";

// @ts-ignore
import translations from 'virtual-laravel-translations';

export const LaravelTranslatorVue = {
    install: (app: App, options: ConfigVue) => {
        const configuredLocale = typeof options.locale === 'string' ? options.locale : options.locale.value;
        const configuredFallbackLocale = typeof options.fallbackLocale === 'string'
            ? options.fallbackLocale
            : options.fallbackLocale?.value ?? null;

        setLocale(configuredLocale, configuredFallbackLocale);

        const localeState = shallowRef(getLocale());
        const stopLocaleSubscription = onLocaleChange((state) => {
            localeState.value = state;
        });
        const stopLocaleWatcher = typeof options.locale === 'string'
            ? null
            : watch(options.locale, (locale) => setLocale(locale, getLocale().fallbackLocale), {flush: 'sync'});
        const stopFallbackLocaleWatcher = !options.fallbackLocale || typeof options.fallbackLocale === 'string'
            ? null
            : watch(options.fallbackLocale, (fallbackLocale) => setLocale(getLocale().locale, fallbackLocale), {flush: 'sync'});

        const configuration = computed(() => ({
            locale: localeState.value.locale,
            fallbackLocale: localeState.value.fallbackLocale,
            translations: translations,
        }));

        if (typeof app.onUnmount === 'function') {
            app.onUnmount(() => {
                stopLocaleSubscription();
                stopLocaleWatcher?.();
                stopFallbackLocaleWatcher?.();
            });
        }

        const translationCallback = (key: string, replace?: object, locale?: string) => trans(key, replace, undefined, {
            locale: locale || configuration.value.locale,
            fallbackLocale: configuration.value.fallbackLocale,
            translations: configuration.value.translations,
        });

        const translationWithPluralizationCallback = (key: string, number: number, replace?: Object, locale?: string) => trans_choice(key, number, replace, undefined, {
            locale: locale || configuration.value.locale,
            fallbackLocale: configuration.value.fallbackLocale,
            translations: configuration.value.translations,
        });

        if (parseInt(app.version) > 2) {
            app.provide('__', translationCallback);
            app.provide('t', translationCallback);
            app.provide('trans', translationCallback);
            app.provide('trans_choice', translationWithPluralizationCallback);
            app.provide('transChoice', translationWithPluralizationCallback);

            app.config.globalProperties.__ = translationCallback;
            app.config.globalProperties.t = translationCallback;
            app.config.globalProperties.trans = translationCallback;
            app.config.globalProperties.trans_choice = translationWithPluralizationCallback;
            app.config.globalProperties.transChoice = translationWithPluralizationCallback;
        } else {
            app.mixin({
                methods: {
                    __: translationCallback,
                    t: translationCallback,
                    trans: translationCallback,
                    trans_choice: translationWithPluralizationCallback,
                    transChoice: translationWithPluralizationCallback,
                },
            });
        }

        return app;
    }
};

declare module '@vue/runtime-core' {
    export interface ComponentCustomProperties {
        trans: (key: string, replace?: object, locale?: string, config?: Config) => string;
        transChoice: (key: string, number: number, replace?: Object, locale?: string, config?: Config) => string;
        __: (key: string, replace?: object, locale?: string, config?: Config) => string;
        t: (key: string, replace?: object, locale?: string, config?: Config) => string;
        trans_choice: (key: string, number: number, replace?: Object, locale?: string, config?: Config) => string;
    }
}

interface ConfigVue {
    locale: string | Ref<string>;
    fallbackLocale?: string | Ref<string>;
}
