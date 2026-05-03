# @akabeko/music-metadata-editor-cli

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](../../LICENSE)

日本語 / [English](README.md)

[@akabeko/music-metadata-editor](../core) のコマンドライン インターフェイスです。Phase 1 ではプログラム骨格のみを提供し、`mme --version` / `mme --help` が動く状態です。後続のフェーズでサブコマンドを順次追加していきます。

> **ステータス**: npm 未公開。Phase 5 でリリース対応が入るまで `private` パッケージとして扱います。

## 動作環境

- Node.js 24 以降 (`@akabeko/music-metadata-editor` と同じ)

## ローカルでの利用

リポジトリのルートから:

```sh
pnpm install
pnpm --filter @akabeko/music-metadata-editor-cli build
node packages/cli/dist/bin/mme.js --version
node packages/cli/dist/bin/mme.js --help
```

`mme --version` は `package.json` の `version` をそのまま出力します。`mme --help` は commander 標準の usage ブロックを表示します。

## 終了コード

CLI は固定の終了コード表を採用します。**正本は [`docs/plan/cli/phase-01-foundation.md`](../../docs/plan/cli/phase-01-foundation.md)** で、本 README はクイック リファレンスとしてミラーしています。

| コード | 意味 |
| --- | --- |
| `0` | 成功 |
| `1` | 未分類のエラー (未マッピングの `MmeError.code` のフォールバックも兼ねる) |
| `2` | 引数不正 (commander の使い方ミス) |
| `3` | フォーマット未対応 (`MmeError.code === "unsupported-format"`) |
| `4` | ファイル / ストリーム I/O 失敗 (`ENOENT`、`EACCES` など) |
| `5` | タグの構造異常 (`MmeError.code === "invalid-tag"`) |

## 開発

`packages/cli` 内:

```sh
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

ワークスペース全体:

```sh
pnpm -r typecheck
pnpm -r test
pnpm -r build
pnpm check
```

## パッケージ構成

[`docs/rules/directory-structure.md`](../../docs/rules/directory-structure.md) のディレクトリ規約に従っています。Phase 1 で敷くスケルトン:

```
src/
  cli.ts                          # createProgram + runCli
  bin/mme.ts                      # bin shim
  commands/
    registerVersionAndHelp.ts     # commander の初期設定
  output/
    writeJson.ts                  # stdout (機械可読)
    writePretty.ts                # stdout (人間可読。Phase 1 は JSON フォールバック)
    printWarning.ts               # stderr
  errors/
    exitCodes.ts                  # 終了コード定数 + MmeError からのルックアップ表
    formatMmeError.ts             # 例外 -> { message, exitCode } 変換
  types.ts                        # CLI 内共有 type
tests/
  cliRunner.ts                    # テストから runCli を再エクスポートする helper
  cli.smoke.test.ts               # bin の shebang を子プロセスで起動するスモーク テスト
```

## ロードマップ

フェーズごとの計画は [`docs/plan/cli/`](../../docs/plan/cli/) を参照してください。Phase 2 で `read` サブコマンド、Phase 3 でフィールド単位の書き込みフラグ、Phase 4 で extras (pictures / chapters / lyrics)、Phase 5 で npm 公開準備を進めます。
