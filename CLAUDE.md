# CLAUDE.md

このファイルは Claude Code (claude.ai/code) が本リポジトリで作業する際の指針です。
ルールを増減した際は、該当セクションを編集するだけで反映できるよう章単位で構成しています。

## プロジェクト概要

`music-metadata-editor` は音楽ファイルのメタデータを読み書きする Node.js + TypeScript 製ライブラリです。
C# 実装の [ATL.NET (Zeugma440/atldotnet)](https://github.com/Zeugma440/atldotnet) を機能面の参考とします。

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

設計・実装で守るべき規約は `docs/rules/` 配下にトピック単位で分割しています。
索引と各ルールの概要は **[`docs/rules/README.md`](docs/rules/README.md)** を参照してください。

ルールを増減する際は対応するファイルを編集し、必要なら `docs/rules/README.md` の索引を更新します。

## ディレクトリ規約

```
src/
  index.ts              # 公開 API のエントリ ポイント
  types.ts              # 全モジュール共用の type 定義 (TagData, AudioFormat, PictureInfo, ...)
  constants.ts          # 全モジュール共用の定数 (必要が生じたタイミングで作成)
  io/                   # バイナリ I/O ユーティリティ (Buffer ラッパーなど)
  formats/              # コンテナ形式ごとの read/write (mp3, flac, mp4, ogg, wav, ...)
  tags/                 # タグ形式ごとの read/write (id3v1, id3v2, ape, vorbisComment, ...)
  utils/                # 汎用ユーティリティ
docs/
  README.md             # docs/ 配下のサブディレクトリ案内
  plan/                 # 実装計画 (フェーズ別)
    README.md
    phase-XX-*.md
  rules/                # 開発ルール (トピック別)
    README.md
    code-style.md
    language-runtime.md
    testing.md
    types-and-constants.md
    git.md
```

サブディレクトリ (`tags/id3v2/` など) 内でも、複数ファイルで共有する型は同階層の `types.ts`、定数は `constants.ts` に集約します (`docs/rules/types-and-constants.md` を参照)。

ディレクトリ構成は Phase 1 でファイナライズします。`docs/plan/phase-01-foundation.md` の決定事項を正とし、本ファイルとずれが生じた場合は CLAUDE.md を更新します。

## ドキュメント参照

- ドキュメント目次: `docs/README.md`
- 開発ルール (トピック別): `docs/rules/README.md`
- 実装計画 (フェーズ別): `docs/plan/README.md`
- ATL.NET ソース (参考実装): <https://github.com/Zeugma440/atldotnet> — ローカル clone がある場合はそのパスをユーザーに確認してから参照する
- ATL.NET フォーマット互換性表: <https://docs.google.com/spreadsheets/d/1Wo9ifsKbBloofdWCsoXziAtaS-QVjqci5aavAV8dt2U/>
