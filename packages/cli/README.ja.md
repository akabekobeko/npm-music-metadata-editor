# @akabeko/music-metadata-editor-cli

[![npm](https://img.shields.io/npm/v/@akabeko/music-metadata-editor-cli.svg)](https://www.npmjs.com/package/@akabeko/music-metadata-editor-cli)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

日本語 / [English](README.md)

`mme` は [@akabeko/music-metadata-editor](../core) のコマンドライン版です。Node.js 用の API と同じコア ライブラリを共有し、音楽ファイルのメタデータ (タグ、埋め込み画像、チャプター マーク、歌詞) を読み書きできます。

## 動作環境

- Node.js 24 以降 (`@akabeko/music-metadata-editor` と同じ)

## インストール

```sh
# グローバル インストール
npm install -g @akabeko/music-metadata-editor-cli

# またはインストールせずに実行
pnpm dlx @akabeko/music-metadata-editor-cli --help
npx @akabeko/music-metadata-editor-cli --help
```

bin 名は `mme` です。

## クイック スタート

```sh
# JSON でメタデータを読む
mme read song.mp3

# 特定フィールドだけ取り出す
mme read song.mp3 --field tag.title

# タグを書き込む (既定は atomic)
mme write song.mp3 --title 'Hello' --artist 'World'

# 埋め込みカバー アートをファイルに取り出す
mme picture extract song.mp3 --output cover.jpg

# 歌詞を LRC 形式で表示する
mme lyrics get song.mp3 --format lrc
```

各サブコマンドの全フラグは `mme help <subcommand>` または `mme <subcommand> --help` で参照できます。

## サブコマンド

| コマンド | 用途 |
| --- | --- |
| `mme read [file]` | メタデータの読み込み (既定 JSON、`--pretty` で人間可読、`--field` で単一値)。stdin からのストリーム読み込みにも対応 |
| `mme write [file]` | タグ フィールドの設定 / クリア。ファイル モードは atomic 書き込み既定。`--dry-run` で書き込みなしの確認 |
| `mme picture extract <file>` | 埋め込み画像をファイル / stdout に取り出す |
| `mme picture set <file>` | 埋め込み画像を追加。`--replace` で既存画像を置換 |
| `mme picture clear <file>` | 埋め込み画像を削除 (`--kind` でスコープ指定可) |
| `mme chapter list <file>` | チャプター マークの一覧 (JSON または `--pretty` 表) |
| `mme chapter set <file>` | JSON ドキュメントからチャプター列を入れ替え |
| `mme chapter clear <file>` | 全てのチャプター マークを削除 |
| `mme lyrics get <file>` | 歌詞を `text` (既定) / `lrc` / `json` で表示 |
| `mme lyrics set <file>` | `--text` / `--lrc` / `--json` から歌詞を埋め込む |
| `mme lyrics clear <file>` | 埋め込み歌詞を削除 |

### グローバル フラグ

| フラグ | 動作 |
| --- | --- |
| `-V, --version` | CLI のバージョンを表示 |
| `-h, --help` | ヘルプを表示 |
| `--no-color` | stderr の ANSI 色出力を無効化 |
| `--quiet` | info / warning ラインを抑止 (error は残す) |
| `--verbose` | debug トレースを出力。`--quiet` と同時指定すると exit code `2` |

[NO_COLOR](https://no-color.org/) と [FORCE_COLOR](https://force-color.org/) 環境変数も尊重します。

## 終了コード

リポジトリ全体と同じ終了コード表を採用します。**正本は [`docs/plan/cli/phase-01-foundation.md`](../../docs/plan/cli/phase-01-foundation.md)**、本表はクイック リファレンスです。

| コード | 意味 |
| --- | --- |
| `0` | 成功 |
| `1` | 未分類のエラー (未マッピングの `MmeError.code` のフォールバックも兼ねる) |
| `2` | 引数不正 (commander の使い方ミス。`--quiet` + `--verbose` も含む) |
| `3` | フォーマット未対応 (`MmeError.code === "unsupported-format"`) |
| `4` | ファイル / ストリーム I/O 失敗 (`ENOENT`、`EACCES` など) |
| `5` | タグの構造異常 (`MmeError.code === "invalid-tag"`) |

CI / シェル運用は `if [ $? -eq 0 ]; then ...; fi` を前提にできます。判明している失敗は表に従い、未分類のものは無関係なコードを使い回さず `1` に集約します。

## 既知の制限

- JSON 出力に `pictures[].data` は **含まれません** (バイナリは JSON 上で読めないため)。`byteLength` のみを残し、本体は `mme picture extract` で取得してください。
- `mme write --clear all` は使えますが、ストリーム モード (`mme write --stdin`) では `--clear` を使えません (現在のトラックを差し引く必要があるため)。クリア操作はファイル モードで行ってください。
- `mme lyrics get --format text` は LRC の同期タイミングを落とします。タイムスタンプを残したい場合は `--format lrc` または `--format json` を指定してください。
- シェル補完スクリプトは未提供です。`commander` 系の補完ツール (`@commander-js/extra-typings`、`bash-complete-commander` など) を将来的に同梱する余地を残しています。

## 既存ツールとの対応表

他の代表的なタグ ツールと `mme` の対応 (簡易表)。1:1 にならないフラグもあるので、最終的な仕様は `mme <subcommand> --help` を参照してください。

### eyeD3 (ID3 / MP3)

| eyeD3 | mme |
| --- | --- |
| `eyeD3 song.mp3` | `mme read song.mp3 --pretty` |
| `eyeD3 --title 'X' song.mp3` | `mme write song.mp3 --title 'X'` |
| `eyeD3 --artist 'A' --album 'B' song.mp3` | `mme write song.mp3 --artist 'A' --album 'B'` |
| `eyeD3 --add-image cover.jpg:FRONT_COVER song.mp3` | `mme picture set song.mp3 --input cover.jpg --kind cover-front` |
| `eyeD3 --remove-all-images song.mp3` | `mme picture clear song.mp3` |
| `eyeD3 --remove-all song.mp3` | `mme write song.mp3 --clear all` |

### mid3v2 (mutagen / ID3v2)

| mid3v2 | mme |
| --- | --- |
| `mid3v2 song.mp3` | `mme read song.mp3 --pretty` |
| `mid3v2 -t 'X' song.mp3` | `mme write song.mp3 --title 'X'` |
| `mid3v2 -a 'A' -A 'B' song.mp3` | `mme write song.mp3 --artist 'A' --album 'B'` |
| `mid3v2 --picture cover.jpg song.mp3` | `mme picture set song.mp3 --input cover.jpg` |
| `mid3v2 --delete-all song.mp3` | `mme write song.mp3 --clear all` |

### metaflac (FLAC)

| metaflac | mme |
| --- | --- |
| `metaflac --show-tag=TITLE song.flac` | `mme read song.flac --field tag.title` |
| `metaflac --set-tag=TITLE='X' song.flac` | `mme write song.flac --title 'X'` |
| `metaflac --import-picture-from=cover.jpg song.flac` | `mme picture set song.flac --input cover.jpg` |
| `metaflac --remove-all-tags song.flac` | `mme write song.flac --clear all` |

### AtomicParsley (MP4 / M4A / M4B)

| AtomicParsley | mme |
| --- | --- |
| `AtomicParsley song.m4a` | `mme read song.m4a --pretty` |
| `AtomicParsley song.m4a --title 'X'` | `mme write song.m4a --title 'X'` |
| `AtomicParsley song.m4a --artwork cover.jpg` | `mme picture set song.m4a --input cover.jpg` |
| `AtomicParsley song.m4a --remove artwork` | `mme picture clear song.m4a` |
| `AtomicParsley song.m4a --DeepScan ...` | `mme write song.m4a ...` (`--overWrite` 不要 — 既定で atomic) |

## 開発

`packages/cli` 内:

```sh
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
```

ワークスペース全体:

```sh
pnpm -r typecheck
pnpm -r test
pnpm -r build
pnpm check
```

publish の dry-run は次のコマンドで確認できます (実 publish は別途):

```sh
pnpm --filter @akabeko/music-metadata-editor-cli publish --dry-run --access public
```

## License

[MIT](LICENSE).
