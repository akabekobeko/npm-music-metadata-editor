# music-metadata-editor

[![Test](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml/badge.svg)](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

日本語 / [English](README.md)

音楽ファイルのメタデータを読み書きする Node.js 向けツールキットです。リポジトリは pnpm workspace 構成で、コアとなる TypeScript ライブラリの上に CLI / GUI パッケージを追加していく予定です。

## Packages

| パッケージ | バージョン | 説明 |
| --- | --- | --- |
| [`@akabeko/music-metadata-editor`](packages/core) | [![npm](https://img.shields.io/npm/v/@akabeko/music-metadata-editor.svg?label=%20)](https://www.npmjs.com/package/@akabeko/music-metadata-editor) | コア ライブラリ。関数中心 API でタグの読み書きを提供 (Node.js 24+) |

## ドキュメント

- [`docs/`](docs/README.ja.md) — ドキュメント目次
- [`docs/rules/`](docs/rules) — コーディング / テスト / Git のルール
- [`docs/plan/`](docs/plan) — フェーズ単位の実装計画

## 開発

Node.js 24 / pnpm 10 が必要です ([`.mise.toml`](.mise.toml) で固定)。

```sh
pnpm install
pnpm typecheck      # 全パッケージで tsc --noEmit
pnpm test           # 全パッケージで vitest
pnpm build          # 全パッケージのビルド
pnpm check          # Biome の format + lint + import 整理 (書き込み)
```

特定パッケージのスクリプトは `pnpm --filter <package> <script>` で実行できます。例: `pnpm --filter @akabeko/music-metadata-editor fixtures:mp3`。

## License

[MIT](LICENSE).
