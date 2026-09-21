import {glob} from "glob";
import {basename, sep, join, resolve} from "path";
import {Engine, Return} from 'php-parser'
import {writeFileSync, readFileSync, statSync} from "fs";

interface CandidateTranslation {
    type: 'php' | 'json'
    basePath: string
    path: string
    name: string | null
    nesting: string[]
    locale: string
}

const engine = new Engine({})

interface CachedTranslation {
    mtimeMs: number
    size: number
    content: object | null
}

// PHP parsing dominates development rebuild time. Reuse parsed files that did not
// change; catalogue assembly still starts from scratch, so file precedence stays exact.
const fileCache = new Map<string, CachedTranslation>()

export const invalidateTranslationFile = (file: string) => {
    fileCache.delete(resolve(file))
}

export const exportTranslations = (...paths: string[]) => {
    const translationFiles: CandidateTranslation[] = []

    paths.forEach((path) => {
        translationFiles.push(...getTranslationCandidates(`./**/*.php`, path, 'php'))
        translationFiles.push(...getTranslationCandidates(`*.json`, path, 'json'))
    })

    const translations = {}

    translationFiles.forEach((candidate) => {
        let content: null | object
        if (candidate.type === 'php') {
            content = importPhpFile(candidate.basePath, candidate);
        } else {
            content = importJsonFile(candidate.basePath, candidate);
        }

        if (!content) {
            return
        }

        if (!translations[candidate.locale]) {
            translations[candidate.locale] = {}
        }

        if (!translations[candidate.locale][candidate.type]) {
            translations[candidate.locale][candidate.type] = {}
        }

        let current = translations[candidate.locale][candidate.type]
        candidate.nesting.forEach((nest) => {
            if (!current[nest]) {
                current[nest] = {}
            }

            current = current[nest]
        })

        if (candidate.name) {
            current[candidate.name] = content
        } else {
            translations[candidate.locale][candidate.type] = {...current, ...content}
        }
    })

    return translations
}

const getTranslationCandidates = (pattern: string, path: string, type: 'php' | 'json'): CandidateTranslation[] => {
    return glob.sync(pattern, {cwd: path}).map((transPath) => {
        const withoutExtension = transPath.split('.').shift()
        const name = type === 'php' ? basename(withoutExtension).toLocaleLowerCase() : null
        const locale = withoutExtension.split(sep).shift().toLocaleLowerCase()
        const nesting = withoutExtension.split(sep).slice(1, -1)
        return {
            type,
            basePath: path,
            path: transPath,
            name,
            nesting,
            locale,
        }
    })
}

const importJsonFile = (basePath: string, file: CandidateTranslation): object => {
    // JSON parsing is cheap, and retaining another copy of a potentially large flat
    // catalogue would cost more memory than the cache saves.
    return JSON.parse(readFileSync(resolve(basePath, file.path)).toString())
}

const importPhpFile = (basePath: string, file: CandidateTranslation): object | null => {
    return importFile(basePath, file, (content) => {
        const phpArray = engine.parseCode(content, basename(file.path))
            .children.find((child) => child.kind === 'return') as Return | undefined

        if (phpArray?.expr?.kind !== 'array') {
            return null
        }

        return parseExpr(phpArray.expr)
    })
}

const importFile = (
    basePath: string,
    file: CandidateTranslation,
    parse: (content: string) => object | null,
): object | null => {
    const absolutePath = resolve(basePath, file.path)
    const stats = statSync(absolutePath)
    const cached = fileCache.get(absolutePath)

    if (cached && cached.mtimeMs === stats.mtimeMs && cached.size === stats.size) {
        return cached.content
    }

    const content = parse(readFileSync(absolutePath).toString())

    fileCache.set(absolutePath, {
        mtimeMs: stats.mtimeMs,
        size: stats.size,
        content,
    })

    return content
}

const parseExpr = (expr) => {
    if (expr.kind === 'string') {
        return expr.value
    }

    if (expr.kind === 'array') {
        let items = expr.items.map((item) => parseExpr(item))

        if (expr.items.every((item) => item.key !== null)) {
            items = items.reduce((acc, val) => Object.assign({}, acc, val), {})
        }

        return items
    }

    if (expr.kind === 'bin') {
        return parseExpr(expr.left) + parseExpr(expr.right)
    }

    if (expr.key) {
        return {[expr.key.value]: parseExpr(expr.value)}
    }

    return parseExpr(expr.value)
}

export const saveJsonFile = (path: string, content: object) => {
    const file = join(path, 'translations.json')

    writeFileSync(file, JSON.stringify(content))
    invalidateTranslationFile(file)
}
