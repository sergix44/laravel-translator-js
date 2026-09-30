import {expect, test} from "vitest";
import {exportTranslations} from "../src/exporter";
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import path from 'node:path'


test('exports simple locale', async () => {
    const trans = exportTranslations('./tests/fixtures/locales')

    expect(trans).toEqual({
        "en": {
            "php": {
                "auth": {
                    "failed": "These credentials are incorrect.",
                    "throttle": "Too many login attempts. Please try again in :seconds seconds."
                }, "domain": {"user": {"sub_dir_support_is_amazing": "Subdirectory override is amazing"}}
            }
        }
    })
})

test('preserves PHP array shapes and lets later duplicate keys win', () => {
    const langPath = mkdtempSync(path.join(tmpdir(), 'laravel-translator-arrays-'))

    try {
        mkdirSync(path.join(langPath, 'en'))
        writeFileSync(path.join(langPath, 'en', 'messages.php'), `<?php return [
            'duplicate' => 'Before',
            'nested' => [
                'duplicate' => 'Before',
                'list' => ['One', 'Two'],
                'numeric' => [0 => 'Zero', 2 => 'Two'],
                'mixed' => ['named' => 'Named', 'Unnamed'],
                'empty' => [],
                'duplicate' => 'After',
            ],
            'duplicate' => 'After',
        ];`)

        expect(exportTranslations(langPath)).toEqual({
            en: {php: {messages: {
                duplicate: 'After',
                nested: {
                    duplicate: 'After',
                    list: ['One', 'Two'],
                    numeric: {0: 'Zero', 2: 'Two'},
                    mixed: [{named: 'Named'}, 'Unnamed'],
                    empty: {},
                },
            }}},
        })
    } finally {
        rmSync(langPath, {recursive: true, force: true})
    }
})

test('later translation paths replace PHP groups and merge JSON keys', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'laravel-translator-precedence-'))
    const first = path.join(root, 'first')
    const second = path.join(root, 'second')

    try {
        for (const langPath of [first, second]) {
            mkdirSync(path.join(langPath, 'en'), {recursive: true})
        }

        writeFileSync(path.join(first, 'en', 'messages.php'),
            '<?php return ["title" => "Before", "first_only" => "Original PHP"];')
        writeFileSync(path.join(second, 'en', 'messages.php'),
            '<?php return ["title" => "After"];')
        writeFileSync(path.join(first, 'en.json'),
            JSON.stringify({shared: 'Before', first_only: 'Original JSON'}))
        writeFileSync(path.join(second, 'en.json'),
            JSON.stringify({shared: 'After', second_only: 'Additional JSON'}))

        expect(exportTranslations(first, second)).toEqual({
            en: {
                php: {messages: {title: 'After'}},
                json: {shared: 'After', first_only: 'Original JSON', second_only: 'Additional JSON'},
            },
        })
    } finally {
        rmSync(root, {recursive: true, force: true})
    }
})

test('exports complex locale', async () => {
    const trans = exportTranslations('./tests/fixtures/lang')

    expect(trans).toEqual({
            "pt": {
                "php": {
                    "auth": {
                        "failed": "As credenciais indicadas não coincidem com as registadas no sistema.",
                        "password": "A palavra-passe indicada está incorreta.",
                        "foo": {"level1": {"level2": "barpt"}}
                    }, "nested": {"cars": {"car": {"is_electric": "É elétrico?", "foo": {"level1": {"level2": "barpt"}}}}}
                },
                "json": {
                    "Welcome!": "Bem-vindo!",
                    "Welcome, :name!": "Bem-vindo, :name!",
                    "hi :name, hi :name": "olá :name, olá :name",
                    "{1} :count minute ago|[2,*] :count minutes ago": "{1} há :count minuto|[2,*] há :count minutos",
                    "foo.bar": "baz",
                    "Start/end": "Início/Fim",
                    "Get started.": "Comece.",
                    "<div>Welcome</div>": "<div>Bem-vindo</div>"

                }
            },
            "fr": {"php": {"auth": {"failed": "Ces identifiants ne correspondent pas à nos enregistrements."}}},
            "en": {
                "php": {
                    "auth": {
                        "failed": "These credentials do not match our records.",
                        "password": "The provided password is incorrect.",
                        "foo": {"level1": {"level2": "baren"}},
                        "arr": ["foo", "bar"],
                        "multiline": "Lorem ipsum dolor sit amet.",
                        "accepted_1": "The :attribute must be accepted.",
                        "accepted_2": "The :Attribute must be accepted.",
                        "accepted_3": "The :ATTRIBUTE must be accepted.",
                    },
                    "nested": {"cars": {"car": {"is_electric": "Electric", "foo": {"level1": {"level2": "barpt"}}}}},
                    "domain": {
                        "user": {
                            "user": "User|Users",
                            "first_name": "First name",
                            "sub_dir_support_is_amazing": "Subdirectory support is amazing"
                        },
                        "car": {
                            "car": "Car|Cars",
                            "is_electric": "Electric",
                            "charge_speed": "Charge speed",
                            "foo": {"level1": {"level2": "barpt"}}
                        }
                    }
                },
                "json": {
                    "Welcome!": "Wecome!",
                    "Welcome, :name!": "Welcome, :name!",
                    "Only Available on EN": "Only Available on EN",
                    "{1} :count minute ago|[2,*] :count minutes ago": "{1} :count minute ago|[2,*] :count minutes ago",
                    "Start/end": "Start/End",
                    "Get started.": "Get started.",
                    "English only.": "English only."

                }
            },
            "zh_tw": {"json": {"Welcome!": "歡迎"}},
            "es": {"json": {"Welcome!": "Bienvenido!"}},
            "de": {"json": {"auth.arr.0": "foo", "auth.arr.1": "bar"}}
        }
    )
})
