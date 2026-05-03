# 実装計画

`music-metadata-editor` リポジトリの実装計画をパッケージ単位で分割したドキュメント群です。各パッケージの計画はフェーズ単位の Markdown としてさらに細分化しています。

## パッケージ別の計画

| パッケージ | 状態 | 計画索引 | 概要 |
| --- | --- | --- | --- |
| `@akabeko/music-metadata-editor` (core) | リリース済 (v1) | [`core/README.md`](core/README.md) | 共通ライブラリ。Phase 01〜10 で読み書き対応コンテナを順次実装 |
| `@akabeko/music-metadata-editor-cli` (cli) | リリース準備完了 | [`cli/README.md`](cli/README.md) | core を CLI として提供。commander ベースのコマンド ツリー |

新しいパッケージの計画を追加するときは `docs/plan/<package>/` を作成し、上の表にエントリを追記します。

## 進め方の共通方針

- 各フェーズは「**完了条件 (DoD)**」を満たすことをもって完了とする。
- フェーズをまたぐ依存は各フェーズの「依存」セクションで明示する。前提フェーズが TODO のまま着手しない。
- パッケージ間で依存がある場合 (例: cli → core) は、**依存先パッケージの最新 release 済み機能** を前提とし、未リリースの core 変更が必要なら core 側にフェーズを追加してから cli 側を進める。
- リポジトリ全体で守るべき設計・実装ルールは [`../rules/README.md`](../rules/README.md) を参照。
- 参考実装の ATL.NET ([Zeugma440/atldotnet](https://github.com/Zeugma440/atldotnet)) はソース取得方法をユーザーに確認してから参照する (`../../CLAUDE.md` の「プロジェクト概要」を参照)。
