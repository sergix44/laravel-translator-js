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

    const virtualModuleId = 'virtual-laravel-translations'
    const resolvedVirtualModuleId = '\0' + virtualModuleId

    const paths = [frameworkLangPath, langPath, ...additionalLangPaths]
    return {
        name: 'laravel-translator',
        config: () => ({
            define: {
                __LARAVEL_TRANSLATIONS__: exportTranslations(...paths)
            },
            ssr: {
                noExternal: ['laravel-translator']
            },
        }),
        handleHotUpdate(ctx) {
            for (const lp of paths) {
                const relative = path.relative(lp, ctx.file);
                const isSub = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
                if (isSub) {
                    const virtualModule = ctx.server.moduleGraph.getModuleById(resolvedVirtualModuleId)!;
                    ctx.server.moduleGraph.invalidateModule(virtualModule)
                    ctx.server.ws.send({
                        type: 'full-reload',
                        path: '*'
                    });
                    return
                }
            }
        }
    }
}