# CLI 実装計画

`@akabeko/music-metadata-editor-cli` (`packages/cli/`) の実装計画をフェーズ単位で分割したドキュメント群です。core (`@akabeko/music-metadata-editor`) のリリース済み機能を CLI から操作できるようにすることを目的とします。

## 全体像

- core ライブラリの 4 つの公開 API
  - 高レベル: `loadTrack` / `saveTrack`
  - 低レベル: `readMetadata` / `writeMetadata`
- これを次の 2 種類の操作モードに射影する:
  - **ファイル操作モード**: `mme read <file>` / `mme write <file>` がパスを受け取り、内部で `loadTrack` / `saveTrack` を呼ぶ。CLI 利用の主用途。
  - **ストリーム操作モード**: `--stdin` / `--output -` (stdout) を組み合わせ、内部で `readMetadata` / `writeMetadata` を呼ぶ。pipeline 利用向け。

CLI 抽象化のしやすさから、原則ファイル操作モードを既定とし、ストリーム操作モードは pipeline 利用 (`cat in.mp3 | mme read --stdin --format mp3`) のためのフォールバックとして提供します。

## CLI 設計原則

1. **commander v12 系** を採用。サブコマンド + tag フラグの混在パターンが書きやすく、補完・ヘルプ生成に強い。
2. **「動詞 + 目的語」のサブコマンド命名** を基本とする。タグ全体は `mme read` / `mme write`、メディア種別は `mme picture <verb>` / `mme chapter <verb>` / `mme lyrics <verb>` のように **「対象 + 動詞」** に切り替える (kid3-cli / git 流)。ルート直下に動詞を置くと数が膨らむため、対象が広い場合だけサブグループ化する。
3. **既定出力は機械可読 (JSON)、`--pretty` で人間向け**。jq などの後処理ツールと噛み合わせやすくする。
4. **既存ツールの語彙** (eyeD3 / metaflac / mid3v2 / AtomicParsley / exiftool) を尊重し、フラグ名は `--title` / `--artist` のような自然な英単語で揃える。
5. **stdout は CLI の出力結果のみ**。進捗・警告・エラーは stderr に流す。`mme write --stdin --output -` の bytes 出力ともぶつからないようにする。
6. **終了コード規約** を Phase 1 で確立する。`0` (成功) / `1` (一般失敗) / `2` (引数不正) / `3` (フォーマット未対応) / `4` (ファイル I/O 失敗) を起点として、core の `MmeError.code` から決定的にマップする。

## 想定コマンド ツリー (完成形)

```
mme
├── --version / --help
├── read <file> [--pretty] [--field <name>] [--include …] [--exclude …]
│                [--no-warnings] [--stdin --format <fmt>]
├── write <file> [--title <s>] [--artist <s>] [--album <s>] …
│                 [--year <n>] [--track <n[/n]>] [--disc <n[/n]>] [--genre <s>]
│                 [--clear <field>…] [--json <s>] [--tag-file <path>]
│                 [--output <path>] [--dry-run]
│                 [--stdin --format <fmt> --output -]
├── picture
│   ├── extract <file> --output <path> [--kind <kind>] [--index <n>]
│   ├── set     <file> --input <path>  [--kind <kind>] [--mime <mime>] [--description <s>] [--replace]
│   └── clear   <file>                 [--kind <kind>] [--index <n>]
├── chapter
│   ├── list  <file> [--pretty]
│   ├── set   <file> --json <path>
│   └── clear <file>
└── lyrics
    ├── get   <file> [--format text|lrc|json]
    ├── set   <file> [--text <path> | --lrc <path> | --json <path>]
    └── clear <file>
```

各サブコマンドの最小スコープと完成スコープはフェーズで段階的に積む。

## フェーズ一覧

| #  | フェーズ                                | 主なスコープ                                                                 | 状態 |
| -- | -------------------------------------- | --------------------------------------------------------------------------- | ---- |
| 01 | [Foundation](phase-01-foundation.md)   | パッケージ骨格、commander 配線、出力 / エラー戦略、E2E テスト基盤            | TODO |
| 02 | [Read Commands](phase-02-read.md)      | `mme read <file>` (loadTrack)、JSON / pretty 出力、stdin → readMetadata     | TODO |
| 03 | [Write Commands](phase-03-write.md)    | `mme write <file>` (saveTrack)、tag フラグ / JSON、stdin/stdout (writeMeta) | TODO |
| 04 | [Pictures / Chapters / Lyrics](phase-04-extras.md) | 拡張メタデータ向けサブコマンド (画像 / 章 / 歌詞)                  | TODO |
| 05 | [Polish & Release](phase-05-polish.md) | 色 / 静粛モード、ヘルプ拡張、bin 配布、README、npm publish 設定               | TODO |

## 進め方

- 各フェーズは **完了条件 (DoD)** を満たした時点で完了。`pnpm typecheck` / `pnpm test` / `pnpm check` がワークスペース全体で緑である必要がある。
- core の API シグネチャに変更が必要になった場合は、**先に core 側にフェーズを追加** してリリースし、CLI はそれを前提に進める (CLI 側で core を破壊的に変更しない)。
- CLI のディレクトリ規約・コード スタイル・テスト方針は core と共通の [`../../rules/README.md`](../../rules/README.md) に従う。
- フェーズ進行に合わせて `packages/cli/README.md` (利用者向け) を更新する。

## 参考にする CLI 群

実装語彙とフラグ名の決定にあたって、以下の先行ツールを参考にする (順不同)。

| ツール         | 種別                  | 注目点                                                                                  |
| -------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `eyeD3`        | Python / ID3          | サブコマンド + tag フラグ。`set` / `info` / `convert` 等                                |
| `mid3v2`       | Python / ID3          | tag フラグ単独 (`-t` / `-a` 等)                                                         |
| `metaflac`     | C / FLAC              | `--show-tag` / `--set-tag=KEY=VALUE` 等のフラットなフラグ                               |
| `kid3-cli`     | C++ / multi           | 対話モード + サブコマンド (`set`, `get`, `save`)                                        |
| `AtomicParsley`| C++ / MP4             | `--artist` 等の単一目的フラグ + `--overWrite`                                           |
| `exiftool`     | Perl / multi          | `-Tag=value` のフラット フラグ。複数フィールド一括書き換え                              |
| `ffmpeg`       | C / multi             | `-metadata key=value`。出力指定 (`-c copy`) と組み合わせる pipeline 文化                 |
| `jq`           | C / JSON              | JSON pipeline。CLI 出力を JSON 既定にする根拠                                           |

## ライセンスと公開方針

- core と同じ MIT ライセンス
- npm パッケージ名は **`@akabeko/music-metadata-editor-cli`**
- `bin` フィールドで `mme` コマンドを公開する (将来的なコンフリクト懸念から `mme` のみとし、別名は提供しない)
