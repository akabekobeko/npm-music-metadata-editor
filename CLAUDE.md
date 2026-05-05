# CLAUDE.md

このファイルは Claude Code (claude.ai/code) が本リポジトリで作業する際の指針です。ルールを増減した際は、該当セクションを編集するだけで反映できるよう章単位で構成しています。

## プロジェクト概要

`music-metadata-editor` は音楽ファイルのメタデータを読み書きする Node.js + TypeScript 製ツール群です。C# 実装の [ATL.NET (Zeugma440/atldotnet)](https://github.com/Zeugma440/atldotnet) を機能面の参考とします。

ATL.NET のソースを参照する作業 (仕様確認、フィクスチャの所在確認など) が発生した場合は、**ローカルに clone 済みであれば そのパスをユーザーに確認**してください。clone されていない場合はリポジトリ URL から `git clone` するか、関連ファイルだけ取得する方針をユーザーと合意してから進めます。

実装計画はパッケージ単位で `docs/pkg/<package>/plan/` 配下に分割しています。索引は `docs/plan.md` を参照してください。各パッケージのディレクトリーには設計概要 (`architecture.md`) と `/security-review` の結果 (`security-review/`) も置きます。

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

### Pull Request タイトルの scope (本リポジトリ固有)

monorepo 化に伴い、グローバルの Git 規約 (`~/.claude/CLAUDE.md` の「Git リポジトリー運用」) を本リポジトリでは以下のように **上書き** する:

- **Pull Request タイトルは scope 必須**。書式は `<type>(<scope>): <description>`。
  - 例: `feat(core): implement id3v2 editor` / `feat(cli): add read subcommand` / `chore(multiple): adopt scoped PR titles`
- `<scope>` は **`core` / `cli` / `gui` / `multiple`** のいずれか。複数パッケージにまたがる、もしくはリポジトリ全体 (`docs/`、`.github/`、ルート設定など) に効く変更は `multiple`。
- ブランチ名は従来どおり scope を含めず `feat/xxxx` のままにする。
- 個別コミット メッセージへの scope 付与は任意 (squash merge 前提のため PR タイトルが正)。
- 詳細・更新は [`docs/rules/git.md`](docs/rules/git.md) を参照。

scope は `.github/workflows/pr-label.yml` で抽出され、`pkg:<scope>` ラベル (`pkg:core` / `pkg:cli` / `pkg:gui` / `pkg:multiple`) として PR に自動付与される。

## Pull Request 作成前の `/security-review`

Claude Code 依存のため CI 化はせず、**Pull Request 作成前に Claude Code (本ツール) で `/security-review` を実行** し、結果を `docs/pkg/<package>/security-review/` に Markdown として残す運用です。

- ファイル名は **対象パッケージのバージョン名**: 例えば `packages/core/package.json` の `version` が `1.0.0` なら `docs/pkg/core/security-review/v1.0.0.md`、CLI の `0.1.0` なら `docs/pkg/cli/security-review/v0.1.0.md`。
- **同じバージョンで複数回実行した場合は最新の結果で上書き**。バージョンを上げた PR では新しいファイルを追加し、古いバージョンのファイルは履歴として残す (削除しない)。
- 変更が複数パッケージにまたがる場合 (`pkg:multiple`) は、影響を受ける各パッケージの最新バージョン ファイルを更新する。
- `/security-review` がブランチの pending changes のみを対象とする場合でも、**該当パッケージ全体の観点 (入力検証 / バイナリ パース / ファイル I/O / エラー処理 / 依存関係 / DoS) でレビュー** し、致命的な指摘があれば PR をマージ前に修正してから記録する。
- レポートは **日本語** で記載。フォーマットは既存の `v*.md` を踏襲 (メタ情報 / サマリー / 良い点 / 所見 / 次回更新時のチェックリスト)。

Claude Code 自身が `/security-review` を起動できないモード (Skill が読めない等) では、同じ観点を手動レビューでカバーし、メタ情報の「実施方法」欄にその旨を明記する。

## ローカル環境固有情報の取り扱い

リポジトリにコミットする資料・コード・コミット メッセージには **ローカル環境固有の情報を残さない** こと。第三者やコントリビューターから見て無意味、もしくは個人特定につながる情報の漏洩を防ぐ目的。

- 禁止例:
  - 絶対パス (例: `/Users/<name>/...`、`/home/<name>/...`、`C:\Users\<name>\...`、`/Volumes/...`)
  - ホスト名、社内 URL、IP アドレス、認証トークン、API キー などの個人/環境特有値
  - ローカルでのみ意味を持つ環境変数値や シェル alias の前提
- 代替表現:
  - 参考実装の clone パスは「**必要に応じてローカル clone のパスをユーザーに確認**」のように書く (例: ATL.NET / electron-starter)。
  - サンプル パスは `<repo>/...`、`~/...`、`./packages/...` などのプレースホルダで表記する。
  - ユーザー固有設定は `~/.claude/CLAUDE.md` 側に留め、リポジトリの `CLAUDE.md` には書かない。
- 既存の資料を編集する際も同じ観点でレビューし、ローカル パス等が混入していたら同じ PR で削除/置換する。

## ドキュメント参照

- ドキュメント目次: `docs/README.md`
- 開発ルール (トピック別): `docs/rules/README.md`
- 実装計画 (パッケージ別索引): `docs/plan.md` (個別フェーズは `docs/pkg/<package>/plan/`)
- 各パッケージの設計概要: `docs/pkg/<package>/architecture.md`
- `/security-review` 結果: `docs/pkg/<package>/security-review/v<version>.md`
- ATL.NET ソース (参考実装): <https://github.com/Zeugma440/atldotnet> — ローカル clone がある場合はそのパスをユーザーに確認してから参照する
- ATL.NET フォーマット互換性表: <https://docs.google.com/spreadsheets/d/1Wo9ifsKbBloofdWCsoXziAtaS-QVjqci5aavAV8dt2U/>
