# Git 運用 (リポジトリ ルール)

- `main` への直接コミットは禁止。最新の `main` から派生した作業ブランチで進める。
- コミット メッセージは [Conventional Commits v1.0.0](https://www.conventionalcommits.org/en/v1.0.0/) を採用する。
  - 例: `feat: implement id3v2 editor`
- ブランチ名もコミット メッセージと同じ prefix を使う。**prefix のあとに `/` を挟んでグループ化**しやすくする。
  - 例: `feat/id3v2-editor`
- Pull Request 名はコミット メッセージと同じ書式に揃える。
  - 例: `feat: implement id3v2 editor`
