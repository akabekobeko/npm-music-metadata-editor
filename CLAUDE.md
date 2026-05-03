# CLAUDE.md

このファイルは Claude Code (claude.ai/code) が本リポジトリで作業する際の指針です。ルールを増減した際は、該当セクションを編集するだけで反映できるよう章単位で構成しています。

## プロジェクト概要

`music-metadata-editor` は音楽ファイルのメタデータを読み書きする Node.js + TypeScript 製ツール群です。C# 実装の [ATL.NET (Zeugma440/atldotnet)](https://github.com/Zeugma440/atldotnet) を機能面の参考とします。

ATL.NET のソースを参照する作業 (仕様確認、フィクスチャの所在確認など) が発生した場合は、**ローカルに clone 済みであれば そのパスをユーザーに確認**してください。clone されていない場合はリポジトリ URL から `git clone` するか、関連ファイルだけ取得する方針をユーザーと合意してから進めます。

実装計画はフェーズ単位で `docs/plan/` 配下に分割しています。詳細は `docs/plan/README.md` を参照してください。

## リポジトリ構成

pnpm workspace 構成。コアとなるライブラリの上に CLI / GUI を追加していく予定。

```
packages/
  core/                # @akabeko/music-metadata-editor (ライブラリ本体)
docs/                  # ルール / 実装計画 / 設計資料 (リポジトリ全体で共有)
```

新しいパッケージを追加する際は `packages/<name>/` を作り `pnpm-workspace.yaml` (`packages/*` glob) に拾わせる。

## 環境とコマンド

- Node.js 24 / pnpm 10 (`.mise.toml` でバージョン固定)
- ルートの主要スクリプトは `pnpm -r` で全パッケージへデリゲート
  - `pnpm typecheck` — 各パッケージで `tsc --noEmit`
  - `pnpm test` / `pnpm test:coverage` — 各パッケージで Vitest
  - `pnpm test:watch` — `@akabeko/music-metadata-editor` のみ watch
  - `pnpm build` — 各パッケージのビルド (core は `tsc -p tsconfig.build.json` で `packages/core/dist/` に ESM + 型定義を出力)
  - `pnpm check` — Biome のフォーマット + Lint + import 整理 (書き込み、ワークスペース全体)
  - `pnpm lint` / `pnpm format` — Biome の lint / format
- パッケージ固有のスクリプト (`fixtures:*` など) は `pnpm --filter @akabeko/music-metadata-editor <script>` または `cd packages/core && pnpm <script>` で実行

## 開発ルール

設計・実装で守るべき規約は `docs/rules/` 配下にトピック単位で分割しています。索引と各ルールの概要は **[`docs/rules/README.md`](docs/rules/README.md)** を参照してください。

ルールを増減する際は対応するファイルを編集し、必要なら `docs/rules/README.md` の索引を更新します。

## ドキュメント参照

- ドキュメント目次: `docs/README.md`
- 開発ルール (トピック別): `docs/rules/README.md`
- 実装計画 (フェーズ別): `docs/plan/README.md`
- ATL.NET ソース (参考実装): <https://github.com/Zeugma440/atldotnet> — ローカル clone がある場合はそのパスをユーザーに確認してから参照する
- ATL.NET フォーマット互換性表: <https://docs.google.com/spreadsheets/d/1Wo9ifsKbBloofdWCsoXziAtaS-QVjqci5aavAV8dt2U/>
