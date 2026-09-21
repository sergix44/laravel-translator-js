/** A translation lookup can resolve to a string or, for a partial key path, to a subtree. */
export type TranslationValue = string | Record<string, unknown>

export const stringifyTranslation = (value: TranslationValue) =>
    typeof value === 'string' ? value : JSON.stringify(value)
