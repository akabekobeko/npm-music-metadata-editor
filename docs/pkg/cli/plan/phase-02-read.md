# Phase 2: Read Commands

## 目的

CLI の主用途である **「ファイル / pipeline からメタデータを読み出す」** 操作を完成させる。core の `loadTrack` (ファイル) と `readMetadata` (バイト列) の両方を、同じ `mme read` サブコマンドの内部分岐として提供する。

## スコープ

### `mme read <file>` (ファイル モード)

最小形:

```sh
mme read song.mp3
```

- 内部実装: `loadTrack(filePath)` を呼び、返り値の `Track` を JSON で stdout に出力。
- 出力例 (整形なし):

  ```json
  {
    "audioFormat": "mp3",
    "durationMs": 12345,
    "tag": { "title": "...", "artist": "..." },
    "pictures": [{ "mimeType": "image/jpeg", "kind": 3, "byteLength": 12345 }],
    "chapters": [],
    "additionalFields": {},
    "warnings": []
  }
  ```

  ※ `pictures[].data` は **既定で省略** (`Uint8Array` をそのまま JSON.stringify するとオブジェクト化されて読めないため)。`byteLength` のみ残し、本体は `mme picture extract` で取得する設計に統一する。`--with-picture-data` (Phase 4 で本実装) フラグで base64 文字列に切り替える余地を残す。

### `mme read <file> --pretty`

- 人間向けに整形して出力。`--pretty` の体裁案:

  ```
  Format       : mp3 (12.3 s)
  Title        : Foo
  Artist       : Bar
  Album        : Baz
  Track        : 3 / 12
  Disc         : 1 / 1
  Pictures     : 1 (image/jpeg, 12 KiB, cover-front)
  Chapters     : 0
  Lyrics       : present (eng, 245 chars)
  Warnings     : none
  ```

- フィールドごとの未設定 (`undefined`) は行ごと省略する (空欄を並べない)。
- `tag` のフィールドは [`docs/field-mapping.md`](../../../field-mapping.md) の順番に揃える。

### `mme read <file> --field <name>`

- 単一フィールドだけ取り出す。stdout には **値そのもの** を出力 (JSON quote は付けない)。例:

  ```sh
  $ mme read song.mp3 --field title
  Foo
  $ mme read song.mp3 --field tag.title       # 同じ
  Foo
  $ mme read song.mp3 --field audioFormat
  mp3
  $ mme read song.mp3 --field durationMs
  12345
  ```

- パス指定は `tag.title` / `audioFormat` / `durationMs` のように **ドット記法**を許容。`tag.` 接頭辞は省略可 (タグ フィールドへのショートカット)。
- 配列フィールド (`pictures`, `chapters`, `warnings`) を直接指定された場合は **JSON で出力** (型情報を保つため例外)。
- 未存在フィールドは exit code `1` + stderr に `[mme] field "X" not found`。

### `mme read <file> --include <list>` / `--exclude <list>`

- カンマ区切りで `tag,pictures,chapters,lyrics,additionalFields,warnings,audioFormat,durationMs` を絞る。
- `--include` と `--exclude` は排他。両方指定したら exit code `2`。
- 既定はすべて含む (上記の JSON 出力例)。

### `mme read <file> --no-warnings`

- 出力 JSON から `warnings` を除外する。`--include` の細粒度版だが、warnings は CLI 利用で大量に来うる場合があるため独立フラグを切る。

### ストリーム モード: `mme read --stdin --format <fmt>`

- stdin からバイト列を読んで `readMetadata(bytes, { format })` に渡す。
- `--format` は core の `AudioFormat` 列挙のいずれか。core が auto-detect しない (拡張子が無い) ため CLI 側で必須にする。
- 出力 (JSON / pretty / field) はファイル モードと同じユーティリティを通す。
- `<file>` 引数と `--stdin` は排他。両方指定したら exit code `2`。

### 出力フォーマット フラグの相互関係

- `--pretty` と `--field` は排他。両方指定したら exit code `2`。
- `--include` / `--exclude` は `--field` 指定時に無視 (warning を stderr に出す)。

### 警告の表示

- core が `warnings` を返した場合:
  - JSON モード: `warnings` 配列にそのまま含める。
  - pretty モード: 末尾に `Warnings:` セクションで列挙。
  - `--field` モード: stderr に `[warn] ${message}` を出す。stdout 側の値はそのまま返す。
  - `--no-warnings`: いずれのモードでも警告セクションを抑止する (ただし stderr への notification は残すか抑止するか、フラグの意図に揃える — **本フェーズで結論を出す**)。

### コマンド登録

```
src/commands/
  read/
    read.ts                    # createReadCommand(): Command
    handleRead.ts              # ハンドラ本体 (loadTrack / readMetadata 分岐)
    formatTrack.ts             # Track → JSON / pretty / field の変換
    formatTrack.test.ts
    types.ts                   # ReadOptions for the command (parsed argv)
```

`createProgram()` 側に `program.addCommand(createReadCommand())` を追加する。

## 設計方針

- `handleRead` は **stdin / file / output の interface を分離**して受け取る (`type Args = { input: ReadInput; format: ReadOutputFormat; logger: Logger }`)。テストでは `input` と `logger` を差し替えるだけで `process` を触らずに完結する。
- 出力フォーマット決定 (`json` / `pretty` / `field` / `single-field-array`) は `formatTrack` 内の純関数で行う。`handleRead` は I/O のみ。
- `--field` の path 解析は `tag.` プレフィックス補完 → ドット分割 → 安全な lookup (`prototype` を辿らない) の純関数として `formatTrack/getField.ts` に分離する。

## 主要な内部 API (案)

```ts
/** Build the `read` subcommand wired to `loadTrack` / `readMetadata`. */
export const createReadCommand: () => Command;

/** Parsed argv for the `read` command. */
export type ReadCommandOptions = {
  /** Source: file path, or `{ kind: "stdin", format: AudioFormat }`. */
  source: ReadSource;
  /** How to render the result. */
  outputMode: "json" | "pretty" | "field";
  /** Field path (only when outputMode === "field"). */
  field?: string;
  /** Include / exclude lists for the json output. */
  include?: readonly TrackSection[];
  exclude?: readonly TrackSection[];
  /** Suppress `warnings` from the structured output. */
  noWarnings: boolean;
};
```

## 依存

- Phase 1 (CLI 骨格、commander 配線、output / errors ユーティリティ)

## テスト方針

- `formatTrack` の全モード × 代表的な Track Object の組み合わせをスナップショット テスト (vitest の `toMatchSnapshot`) で固定。
  - 空 Track / picture 含む Track / lyrics 含む Track / warnings 含む Track / `additionalFields` ありの Track 5 種類が最低ライン。
- `getField` は path lookup のエッジケース (未存在 / `__proto__` / 配列 index `pictures.0.kind` の形式に対応するか) を網羅。
- `runCli(["read", "tests/fixtures/mp3/sample.mp3"])` で stdout JSON が期待 schema を満たすことを E2E で確認。
- `runCli(["read", "song.mp3", "--field", "tag.title"])` で stdout が単一値文字列で終わることを確認。
- `runCli(["read", "song.mp3", "--pretty"])` で人間可読出力が含むべきラベル (`Format`, `Title`, ...) を `expect.stringContaining` で確認。
- ストリーム モード: `runCli(["read", "--stdin", "--format", "mp3"], { stdin: bytes })` を Phase 1 の helper に対応させて検証。
- 排他フラグ (`--pretty + --field` / `<file> + --stdin` / `--include + --exclude`) はそれぞれ exit code 2 を返すこと。

### フィクスチャ

- `tests/fixtures/` を `packages/cli/` 配下に作る。core の fixtures は cross-package import せず、CLI 用の最小サンプルを **生成スクリプト** で再構築する:
  - `scripts/fixtures/mp3.ts` — タグ済 MP3 を 1 つ生成
  - `scripts/fixtures/flac.ts` — タグ済 FLAC を 1 つ生成 (将来の拡張時に追加)
- 生成スクリプトは core の `loadTrack` / `saveTrack` を組み合わせて作る (core の生成スクリプトと同じ素材から派生させてもよい)。バイナリは commit する。

## 完了条件 (DoD)

- `mme read <file>` が JSON / pretty / field / include / exclude / no-warnings 各モードで動く
- `mme read --stdin --format <fmt>` で stdin 入力が処理できる
- 排他フラグの組み合わせが exit code 2 を返す
- すべての追加コードに対応する `*.test.ts` がある
- `pnpm typecheck` / `pnpm test` / `pnpm check` が通る
- core (`@akabeko/music-metadata-editor`) を改造せず動く (CLI 側のみで完結)

## 参考資料

- core: `packages/core/src/api/loadTrack.ts`、`packages/core/src/api/readMetadata.ts`
- core: `packages/core/src/types.ts` (`Track` / `MetadataReadResult` の shape)
- フィールド対応: [`docs/field-mapping.md`](../../../field-mapping.md)
- pretty 出力の参考: `metaflac --list`、`eyeD3 song.mp3` (default モード)、`exiftool song.mp3`
- field 抽出の参考: `jq` / `exiftool -Title -s -s -s file.jpg` (値だけ出すモード)
