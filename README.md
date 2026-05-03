# music-metadata-editor

[![Test](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml/badge.svg)](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

English / [Japanese](README.ja.md)

A toolkit for reading and writing audio file metadata in Node.js. The repository is organized as a pnpm workspace whose core is a TypeScript library; CLI and GUI packages are planned on top of the same core.

## Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@akabeko/music-metadata-editor`](packages/core) | [![npm](https://img.shields.io/npm/v/@akabeko/music-metadata-editor.svg?label=%20)](https://www.npmjs.com/package/@akabeko/music-metadata-editor) | Core library — function-only API for reading / writing tag data on Node.js 24+. |
| [`@akabeko/music-metadata-editor-cli`](packages/cli) | [![npm](https://img.shields.io/npm/v/@akabeko/music-metadata-editor-cli.svg?label=%20)](https://www.npmjs.com/package/@akabeko/music-metadata-editor-cli) | `mme` command-line tool — read / write tags, pictures, chapters, lyrics. |

## Documentation

- [`docs/`](docs/README.md) — documentation index
- [`docs/rules/`](docs/rules) — coding / testing / git rules
- [`docs/plan.md`](docs/plan.md) — index of per-package implementation plans (`docs/pkg/<package>/plan/`)

## Development

Requires Node.js 24 and pnpm 10 (pinned in [`.mise.toml`](.mise.toml)).

```sh
pnpm install
pnpm typecheck      # tsc --noEmit across all packages
pnpm test           # vitest across all packages
pnpm build          # build all packages
pnpm check          # biome format + lint + organize-imports (write)
```

Per-package commands can be invoked with `pnpm --filter <package> <script>`, e.g. `pnpm --filter @akabeko/music-metadata-editor fixtures:mp3`.

## License

[MIT](LICENSE).
