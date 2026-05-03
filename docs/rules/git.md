# Git 運用 (リポジトリ ルール)

- `main` への直接コミットは禁止。最新の `main` から派生した作業ブランチで進める。
- コミット メッセージは [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) を採用する。
  - 例: `feat: implement id3v2 editor`
- ブランチ名もコミット メッセージと同じ prefix を使う。**prefix のあとに `/` を挟んでグループ化**しやすくする。
  - 例: `feat/id3v2-editor`
  - ブランチ名には `(scope)` を含めない (パスとして扱いにくく、PR タイトル側で明示すれば十分なため)。

## Pull Request タイトル

Pull Request タイトルは **type に scope を必須** とする。書式:

```
<type>(<scope>): <description>
```

- `<type>` は Conventional Commits の type (`feat` / `fix` / `docs` / `refactor` / `chore` 等)。
- `<scope>` は **対象パッケージ名 (または `multiple`)** を以下から選ぶ:
  - `core` — `packages/core/` (`@akabeko/music-metadata-editor`) にのみ手が入る
  - `cli` — `packages/cli/` (`@akabeko/music-metadata-editor-cli`) にのみ手が入る
  - `gui` — `packages/gui/` (将来追加予定の GUI パッケージ) にのみ手が入る
  - `multiple` — 複数パッケージにまたがる、もしくはリポジトリ全体 (`docs/`、`.github/`、ルート設定など) に効く変更
- 例:
  - `feat(core): implement id3v2 editor`
  - `feat(cli): add read subcommand`
  - `chore(multiple): adopt scoped PR titles and per-package labels`

scope の選択は **`pkg:<scope>` ラベル** ([labeler 設定](../../.github/workflows/pr-label.yml)) を経由して GitHub 側でも可視化される。

## 個別コミット

`main` への merge は **squash merge** を前提とし、PR タイトルが merge コミットの message になる。そのため:

- **PR ブランチ内の個別コミット message には `(scope)` を必須としない** (任意)。整える場合は PR タイトルと揃えるのが望ましい。
- コミット message の type prefix (`feat:` 等) はブランチ全体の主目的に合わせる。
- 個別コミットを単独で `cherry-pick` するなど squash 前提で動かないユース ケースが出てきた時点で本ルールを再検討する。
