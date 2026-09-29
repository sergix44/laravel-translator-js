import * as path from 'path'
import {Plugin} from 'vite'
import {exportTranslations} from "./exporter";

export interface VitePluginOptionsInterface {
    langPath?: string
    additionalLangPaths?: string[]
}

export default function laravelTranslator(options: string | VitePluginOptionsInterface = 'lang'): Plugin {
    const langPath = typeof options === 'string' ? options : options.langPath ?? 'lang'
    const additionalLangPaths = typeof options === 'string' ? [] : options.additionalLangPaths ?? []
    const frameworkLangPath = path.join('vendor', 'laravel', 'framework', 'src', 'Illuminate', 'Translation', 'lang')

    const virtualModuleId = 'virtual-laravel-translations'
    const resolvedVirtualModuleId = '\0' + virtualModuleId

    const paths = [frameworkLangPath, langPath, ...additionalLangPaths].map((langPath) => path.resolve(langPath))
    const isTranslationFile = (file: string) => {
        if (!['.php', '.json'].includes(path.extname(file).toLowerCase())) {
            return false
        }

        return paths.some((langPath) => {
            const relativePath = path.relative(langPath, path.resolve(file))

            return relativePath !== ''
                && relativePath !== '..'
                && !relativePath.startsWith(`..${path.sep}`)
                && !path.isAbsolute(relativePath)
        })
    }

    return {
        name: 'laravel-translator',
        config: () => ({
            optimizeDeps: {
                exclude: [virtualModuleId]
            },
            ssr: {
                noExternal: ['laravel-translator']
            },
        }),
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId
            }
            return null
        },
        load(id) {
            if (id === resolvedVirtualModuleId) {
                const catalogue = JSON.stringify(exportTranslations(...paths))

                return `
const translations = ${catalogue}
const listeners = import.meta.hot?.data?.listeners ?? new Set()

export const onTranslationsUpdate = (listener) => {
    if (!import.meta.hot) return () => {}

    listeners.add(listener)
    return () => listeners.delete(listener)
}

if (import.meta.hot?.data) {
    import.meta.hot.data.listeners = listeners
    import.meta.hot.accept((nextModule) => {
        if (!nextModule) return

        for (const listener of [...listeners]) {
            try {
                listener(nextModule.default)
            } catch (error) {
                console.error('[laravel-translator] a hot update listener threw', error)
            }
        }
    })
}

export default translations
`
            }
            return null
        },
        configureServer(server) {
            server.watcher.add(paths)
        },
        handleHotUpdate(ctx) {
            if (!isTranslationFile(ctx.file)) {
                return
            }

            const virtualModule = ctx.server.moduleGraph.getModuleById(resolvedVirtualModuleId)
            if (!virtualModule) {
                return []
            }

            ctx.server.moduleGraph.invalidateModule(virtualModule, new Set(), ctx.timestamp, true)

            return [virtualModule]
        }
    }
}
