import {glob} from "glob";
import {basename, sep, join} from "path";
import {Engine, Return} from 'php-parser'
import {writeFileSync, readFileSync} from "fs";

interface CandidateTranslation {
    type: 'php' | 'json'
    basePath: string
    path: string
    name: string | null
    nesting: string[]
    locale: string
}

const engine = new Engine({})

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
    const content = readFileSync(join(basePath, file.path)).toString()
    return JSON.parse(content)
}

const importPhpFile = (basePath: string, file: CandidateTranslation): object | null => {
    const content = readFileSync(join(basePath, file.path)).toString()
    const phpArray = engine.parseCode(content, basename(file.path))
        .children.filter((child) => child.kind === 'return')[0] as Return

    if (phpArray?.expr?.kind !== 'array') {
        return null
    }

    return parseExpr(phpArray.expr)
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
    writeFileSync(join(path, 'translations.json'), JSON.stringify(content))
}