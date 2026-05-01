# 開発ルール

`music-metadata-editor` の設計・実装で守るべき規約です。**ルールを追加/削除する場合は、対応するファイルを直接編集**してください。新しいトピックを追加する際は本ファイルの索引に行を追加します。

実装ルールは基本的に **Biome (`biome.json`) のルールとして定義**し、Biome で機械的に検出します。Biome として表現しにくいものだけを以下のドキュメントに文章で定義します。

## ルール一覧

| トピック | 概要 |
| --- | --- |
| [コード スタイル](code-style.md) | `class` の不使用、TSDoc、英語コメント、関数の長さ・分割方針、サブルーチン コロケーション |
| [言語 / ランタイム](language-runtime.md) | Node.js 24 + ESM、Node.js 標準ライブラリの活用、外部依存の最小化 |
| [テスト](testing.md) | テスト実装の方針、境界網羅、フィクスチャの扱い |
| [型定義、定数](types-and-constants.md) | `type` / 定数の置き場ルール (`types.ts` / `constants.ts`) |
| [Git 運用](git.md) | コミット / ブランチ / PR の命名 (Conventional Commits v1.0.0) |
| [ディレクトリ規約](directory-structure.md) | `src/` と `docs/` のディレクトリ構成、共用 `types.ts` / `constants.ts` の置き場 |
