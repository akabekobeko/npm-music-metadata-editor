# ドキュメント目次

日本語 / [English](README.md)

`docs/` 配下に置かれているドキュメントの索引です。新しいトピックを追加するときはサブディレクトリを切り、本ファイルにエントリを追記してください。

## パッケージ

- コア ライブラリ: [`packages/core/README.ja.md`](../packages/core/README.ja.md)
- CLI (`mme`): [`packages/cli/README.ja.md`](../packages/cli/README.ja.md)

## サブディレクトリ

| パス | 内容 |
| --- | --- |
| [`pkg/`](pkg/) | パッケージ単位のドキュメント。`pkg/core/`・`pkg/cli/` 配下に実装計画 (`plan/`)、設計概要 (`architecture.md`)、`/security-review` の結果 (`security-review/`) を配置 |
| [`rules/`](rules/README.md) | 開発ルール (トピック別)。コード スタイル、テスト、Git 運用などを 1 トピック 1 ファイルで管理 |

## パッケージを横断する トップ レベル ドキュメント

| パス | 内容 |
| --- | --- |
| [`plan.md`](plan.md) | パッケージ別実装計画のトップ レベル索引。`pkg/<name>/plan/` への入り口 |

## トップレベル ドキュメント

| パス | 内容 |
| --- | --- |
| [`field-mapping.ja.md`](field-mapping.ja.md) | 各タグ形式 (ID3v1/v2、Vorbis Comment、APE、MP4 atoms、RIFF/AIFF、WMA) と `TagData` の対応表 |

## ルート ドキュメント

- Claude Code 向けガイダンス: [`../CLAUDE.md`](../CLAUDE.md)
- 開発ルール (トピック別): [`rules/README.md`](rules/README.md)
- パッケージ概要 / バッジ / 利用例: [`../README.ja.md`](../README.ja.md)
