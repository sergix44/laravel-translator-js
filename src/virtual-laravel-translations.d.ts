declare module 'virtual-laravel-translations' {
    const translations: object

    export const onTranslationsUpdate: (listener: (translations: object) => void) => () => void

    export default translations
}
