# CLAUDE.md

このファイルは Claude Code (claude.ai/code) が本リポジトリで作業する際の指針です。
ルールを増減した際は、該当セクションを編集するだけで反映できるよう章単位で構成しています。

## プロジェクト概要

`music-metadata-editor` は音楽ファイルのメタデータを読み書きする Node.js + TypeScript 製ライブラリです。
C# 実装の [ATL.NET (Zeugma440/atldotnet)](https://github.com/Zeugma440/atldotnet) を機能面の参考とします。

ATL.NET のソースを参照する作業 (仕様確認、フィクスチャの所在確認など) が発生した場合は、**ローカルに clone 済みであれば そのパスをユーザーに確認**してください。clone されていない場合はリポジトリ URL から `git clone` するか、関連ファイルだけ取得する方針をユーザーと合意してから進めます。

実装計画はフェーズ単位で `docs/` 配下に分割しています。詳細は `docs/README.md` を参照してください。

## 環境とコマンド

- Node.js 24 / pnpm 10 (`.mise.toml` でバージョン固定)
- 主要スクリプト
  - `pnpm typecheck` — `tsc --noEmit`
  - `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` — Vitest
  - `pnpm build` — `tsc -p tsconfig.build.json` (`dist/` に ESM + 型定義を出力)
  - `pnpm check` — Biome のフォーマット + Lint + import 整理 (書き込み)
  - `pnpm lint` / `pnpm format` — Biome の lint / format

## 実装ルール

ライブラリの設計・実装で守るべき規約です。**ルールを追加/削除する場合はこの節を直接編集**してください。

実装ルールは基本的に **Biome (`biome.json`) のルールとして定義**し、Biome で機械的に検出します。
Biome として表現しにくいものだけを以下の節に文章で定義します。

### コード スタイル

- **`class` を使わない**。`function` と Plain Object を組み合わせて実装する。
- **TSDoc コメントを次のいずれにも付ける**:
  - `function` / `const` で定義する関数
  - `type` 定義
  - 公開する Object (定数 Object、ファクトリ Object、look-up table など)
- コード内コメントは **英語で書く** (TSDoc も含む)。識別子も英語。
- 関数の引数が 3 以上になったら **`type Args = {}`** として型に括り出す (Biome の `useMaxParams` で 3 引数以上は警告される)
  - 引数の TSDoc コメントは省略して、代わりにこちらのプロパティーにコメントをつける
- 1 関数の本体はおよそ **100 行を上限**。これを超えそうならサブルーチンに分割する。
- 関数は **なるべく 1 ファイル 1 関数** とし、関心を細かく分割する。
- 大きな関数をサブルーチンへ分けてファイル分割する場合、**代表となる関数名のサブディレクトリを掘り、サブルーチンをコロケーション**として並べる (例: `parseId3v2/` 配下に `parseId3v2.ts` とサブルーチンの `parseHeader.ts`、`parseFrame.ts` を置く)。

### 言語 / ランタイム

- ターゲットは **Node.js 24** で実行する **ESM** (パッケージは `"type": "module"`)。
- C# の流儀に引きずられず、**バイナリ操作は Node.js 標準ライブラリ (`node:buffer`、`node:fs/promises`、`node:stream` など) で代替**する。
- 外部依存は最小限に抑える。やむを得ず追加する場合はゼロ依存に近い軽量パッケージを優先する。

### テスト

- **なるべくテストを実装する**。新規関数を書いた時点で対応する `*.test.ts` を同じディレクトリに置くのを基本とする。
- 仕様の境界 (空入力、最大長、エラー値、エンディアンの境界など) を Vitest で網羅する。
- フィクスチャとなる音源ファイルが必要な場合は ATL.NET の `ATL.unit-test/Resources/` を参考に最小サイズで配置する (置き場所は Phase 1 で決定)。

### 型定義、定数

- `type`
  - ある関数に強く依存する場合、その関数と同じファイルに定義する
  - 複数の関数間で共用する場合、**`types.ts`** ファイルに定義する
- 定数
  - ある関数に強く依存する場合、その関数と同じファイルに定義する
  - 複数の関数間で共用する場合、**`constants.ts`** ファイルに定義する

### Git 運用 (リポジトリ ルール)

- `main` への直接コミットは禁止。`feat/`、`fix/`、`docs/`、`chore/`、`refactor/`、`ci/`、`test/` などの接頭辞付きブランチを派生して作業する。
- コミット メッセージは [Conventional Commits](https://gist.github.com/joshbuchea/6f47e86d2510bce28f8e7f42ae84c716) に準拠する。

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
  README.md             # 実装計画の目次
  phase-XX-*.md         # フェーズ別計画書
```

サブディレクトリ (`tags/id3v2/` など) 内でも、複数ファイルで共有する型は同階層の `types.ts`、定数は `constants.ts` に集約します (実装ルール「型定義、定数」を参照)。

ディレクトリ構成は Phase 1 でファイナライズします。`docs/phase-01-foundation.md` の決定事項を正とし、本ファイルとずれが生じた場合は CLAUDE.md を更新します。

## ドキュメント参照

- 実装計画 (フェーズ別): `docs/README.md`
- ATL.NET ソース (参考実装): <https://github.com/Zeugma440/atldotnet> — ローカル clone がある場合はそのパスをユーザーに確認してから参照する
- ATL.NET フォーマット互換性表: <https://docs.google.com/spreadsheets/d/1Wo9ifsKbBloofdWCsoXziAtaS-QVjqci5aavAV8dt2U/>
