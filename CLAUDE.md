# CLAUDE.md

このファイルは Claude Code (claude.ai/code) が本リポジトリで作業する際の指針です。ルールを増減した際は、該当セクションを編集するだけで反映できるよう章単位で構成しています。

## プロジェクト概要

`music-metadata-editor` は音楽ファイルのメタデータを読み書きする Node.js + TypeScript 製ライブラリです。C# 実装の [ATL.NET (Zeugma440/atldotnet)](https://github.com/Zeugma440/atldotnet) を機能面の参考とします。

ATL.NET のソースを参照する作業 (仕様確認、フィクスチャの所在確認など) が発生した場合は、**ローカルに clone 済みであれば そのパスをユーザーに確認**してください。clone されていない場合はリポジトリ URL から `git clone` するか、関連ファイルだけ取得する方針をユーザーと合意してから進めます。

実装計画はフェーズ単位で `docs/plan/` 配下に分割しています。詳細は `docs/plan/README.md` を参照してください。

## 環境とコマンド

- Node.js 24 / pnpm 10 (`.mise.toml` でバージョン固定)
- 主要スクリプト
  - `pnpm typecheck` — `tsc --noEmit`
  - `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` — Vitest
  - `pnpm build` — `tsc -p tsconfig.build.json` (`dist/` に ESM + 型定義を出力)
  - `pnpm check` — Biome のフォーマット + Lint + import 整理 (書き込み)
  - `pnpm lint` / `pnpm format` — Biome の lint / format

## 開発ルール

設計・実装で守るべき規約は `docs/rules/` 配下にトピック単位で分割しています。索引と各ルールの概要は **[`docs/rules/README.md`](docs/rules/README.md)** を参照してください。

ルールを増減する際は対応するファイルを編集し、必要なら `docs/rules/README.md` の索引を更新します。

## ドキュメント参照

- ドキュメント目次: `docs/README.md`
- 開発ルール (トピック別): `docs/rules/README.md`
- 実装計画 (フェーズ別): `docs/plan/README.md`
- ATL.NET ソース (参考実装): <https://github.com/Zeugma440/atldotnet> — ローカル clone がある場合はそのパスをユーザーに確認してから参照する
- ATL.NET フォーマット互換性表: <https://docs.google.com/spreadsheets/d/1Wo9ifsKbBloofdWCsoXziAtaS-QVjqci5aavAV8dt2U/>
