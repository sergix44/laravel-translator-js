import translations, {onTranslationsUpdate} from 'virtual-laravel-translations'

type TranslationChangeListener = (translations: object) => void

let currentTranslations = translations
const listeners = new Set<TranslationChangeListener>()

export const getTranslations = () => currentTranslations

export const onTranslationsChange = (listener: TranslationChangeListener) => {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

export const setTranslations = (next: object) => {
    if (currentTranslations === next) {
        return
    }

    currentTranslations = next
    for (const listener of [...listeners]) {
        try {
            listener(next)
        } catch (error) {
            console.error('[laravel-translator] a translation change listener threw', error)
        }
    }
}

onTranslationsUpdate(setTranslations)
