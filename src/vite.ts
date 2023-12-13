import * as path from 'path'
import {Plugin} from 'vite'
import {exportTranslations} from "./exporter";

export interface VitePluginOptionsInterface {
    langPath?: string
    additionalLangPaths?: string[]
}

export default function laravelTranslator(options: string | VitePluginOptionsInterface = 'lang'): Plugin {
    let langPath = typeof options === 'string' ? options : options.langPath ?? 'lang'
    langPath = langPath.replace(/[\\/]$/, '') + path.sep
    const additionalLangPaths = typeof options === 'string' ? [] : options.additionalLangPaths ?? []
    const frameworkLangPath = 'vendor/laravel/framework/src/Illuminate/Translation/lang/'.replace('/', path.sep)

    const virtualModuleId = 'virtual:laravel-translations'
    const resolvedVirtualModuleId = '\0' + virtualModuleId

    let translations = null
    return {
        name: 'laravelTranslator',
        enforce: 'post',
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                if (!translations) {
                    translations = exportTranslations(frameworkLangPath, langPath, ...additionalLangPaths)
                }

                return `export default ${JSON.stringify(translations)}`
            }
        },
    }
}