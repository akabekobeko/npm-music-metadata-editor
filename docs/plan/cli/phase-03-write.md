# Phase 3: Write Commands

## 目的

`mme write <file>` で **タグ フィールドの編集** をできるようにする。core の `saveTrack` (ファイル経路) と `writeMetadata` (バイト経路) の両方を、Phase 2 と同じく単一サブコマンドの内部分岐で提供する。

このフェーズの完了で、CLI 単独で「読み出し → 部分編集 → 上書き」のラウンドトリップが可能になる。Pictures / Chapters / Lyrics の編集は Phase 4 に切り出し、本フェーズでは **`TagData` のスカラー フィールド** に集中する。

## スコープ

### `mme write <file>` (ファイル モード)

最小形:

```sh
mme write song.mp3 --title "New Title" --artist "New Artist"
```

- 内部実装の流れ:
  1. `loadTrack(filePath)` で現状を取得
  2. CLI 引数から `Partial<TagData>` を構築 (フラグで指定された値だけセット、空文字 `""` は **「設定」**、`--clear` は **「未設定化」**)
  3. `saveTrack({ ...current, tag: { ...current.tag, ...overrides } }, { source: filePath })` で同一パスに上書き
  4. 完了メッセージ (`[mme] wrote: <path>`) を stderr に流し、exit code 0
- `--output <path>` を指定すると `saveTrack(track, { source: filePath, outputPath })` で別パスに書き出す。
- `--dry-run` 指定時は手順 3 の `saveTrack` を呼ばず、変更後 `Track` を JSON で stdout に出すだけ (Phase 2 の `formatTrack` を再利用)。

### タグ フィールド フラグ

`TagData` のスカラー フィールドに対応するフラグを揃える。命名は eyeD3 / AtomicParsley / mid3v2 を参考に **kebab-case** で:

| フラグ | 対応フィールド | 型 |
| --- | --- | --- |
| `--title <s>`           | `title`               | string |
| `--artist <s>`          | `artist`              | string |
| `--album <s>`           | `album`               | string |
| `--album-artist <s>`    | `albumArtist`         | string |
| `--composer <s>`        | `composer`            | string |
| `--conductor <s>`       | `conductor`           | string |
| `--lyricist <s>`        | `lyricist`            | string |
| `--publisher <s>`       | `publisher`           | string |
| `--copyright <s>`       | `copyright`           | string |
| `--comment <s>`         | `comment`             | string |
| `--genre <s>`           | `genre`               | string |
| `--group <s>`           | `group`               | string |
| `--description <s>`     | `description`         | string |
| `--language <s>`        | `language`            | string (ISO-639) |
| `--isrc <s>`            | `isrc`                | string |
| `--product-id <s>`      | `productId`           | string |
| `--year <n>`            | `year`                | integer |
| `--recording-date <s>`  | `recordingDate`       | ISO-8601 string |
| `--original-release-date <s>` | `originalReleaseDate` | ISO-8601 string |
| `--publishing-date <s>` | `publishingDate`      | ISO-8601 string |
| `--track <spec>`        | `trackNumber` / `trackTotal` | `"3"` か `"3/12"` |
| `--disc <spec>`         | `discNumber` / `discTotal`   | `"1"` か `"1/2"` |
| `--bpm <n>`             | `bpm`                 | integer |
| `--rating <n>`          | `rating`              | float `[0, 1]` |

新しいフィールドが core に追加された場合は、本表 + 引数 parser に同期して追記する (`docs/field-mapping.md` も参照)。

### `--clear <field>` / `--clear <field,...>`

- 指定フィールドを `undefined` 化する。`--title ""` (空文字代入) との意味的区別:
  - `--title ""` → `tag.title = ""` (空文字を保存)
  - `--clear title` → `tag.title = undefined` (フォーマット側でフィールドを削除)
- 値指定フラグと `--clear` を **同じフィールドに同時指定** したら exit code 2 (`[mme] cannot --title and --clear title together`)。
- `--clear all` で `TagData` 全フィールドを `undefined` 化するショートカットを提供 (Phase 4 で picture / chapter / lyrics 用の `clear all` も検討)。

### `--json '<json>'` / `--tag-file <path>`

- 一括上書き用。`Partial<TagData>` を JSON で受け取る。
- 個別フラグと併用したときは **「JSON で上書き → 個別フラグでさらに上書き」** の順で適用 (個別フラグ優先)。
- `--tag-file -` は stdin から JSON を読み込む (`--stdin` モードと併用する場合のための予備動作)。
- 不明なキーは exit code 2 で拒否。型不正 (例: `year` に文字列) も同様。

### ストリーム モード: `mme write --stdin --format <fmt> [--output -]`

- stdin から bytes を読んで `writeMetadata(bytes, { tag, format })` を呼び、結果を **`--output -`** で stdout に流す。pipeline 利用想定:

  ```sh
  cat in.mp3 | mme write --stdin --format mp3 --title "X" --output - > out.mp3
  ```

- ファイル モードと違い、現状読込 (`loadTrack`) を経由せずに `writeMetadata` を直接呼ぶ (バイト → バイト)。これにより `--clear` の挙動は core 側 `writeMetadata` の policy (`undefined` フィールドは「保持」) に従う。差を出さないため:
  - **ストリーム モードでは `--clear` を使えない**。core 側 API が「未指定 = 保持」しか提供していないため (代替は core 側に削除指示の WriteOption を追加するフェーズが要る)。
  - 制限は `--help` と本ファイルに明記する。
- ファイル引数と `--stdin` は排他。

### 出力経路と冪等性

- ファイル モードは **既定で in-place 上書き**。安全のため:
  - `loadTrack` が成功した場合のみ `saveTrack` を呼ぶ (parse エラーで途中失敗を抑制)。
  - `saveTrack` が throw したら **元ファイルは触らない** (core が「rebuild した bytes をそのまま `fs.writeFile` で上書き」する実装のため、書き出し中失敗だけは原子性が保証されない可能性がある)。本フェーズで、**`--atomic` フラグで「同一ディレクトリに一時ファイルを書き出して `rename` で差し替える」モード** を実装し、既定 ON にする。
  - `--no-atomic` で従来どおりの直書きに切替可能。
- `--output <path>` が `<file>` と同一パスを指す場合は `--atomic` で対応。
- `--dry-run` 時は filesystem を一切触らない。

### 完了出力

- 既定では stdout は空、stderr に 1 行 `[mme] wrote: <path>` (または stream モードでは `[mme] wrote: <stdout>`)。
- `--quiet` (Phase 5 で本実装) 時は stderr メッセージも省略。

### コマンド登録

```
src/commands/
  write/
    write.ts                 # createWriteCommand(): Command
    handleWrite.ts           # ハンドラ本体 (file / stream 分岐)
    parseTagOverrides.ts     # argv → Partial<TagData> + clear list
    parseTagOverrides.test.ts
    applyOverrides.ts        # Partial<TagData> + clear list → 新しい TagData
    applyOverrides.test.ts
    writeAtomic.ts           # 一時ファイル + rename (Phase 3 の atomic 実装)
    writeAtomic.test.ts
```

## 設計方針

- 「argv → 編集後 Track」と「Track → 書き出し」を別関数に分け、テストではそれぞれ純関数として検証する。
- `applyOverrides` は **新しい `TagData` Object を返す** (mutate しない)。spread で組み立てる core の方針 (`docs/plan/core/phase-10-public-api.md`) を CLI 側でも踏襲する。
- `--track 3/12` のような複合 spec は `parseTagOverrides/parseTrackSpec.ts` 純関数で解析する (`/` 無し時は total 未設定)。
- 数値 / 日付フィールドの validation は CLI 内で完結させる (core に追加検証を要求しない)。

## 主要な内部 API (案)

```ts
/** Build the `write` subcommand wired to `saveTrack` / `writeMetadata`. */
export const createWriteCommand: () => Command;

/** Parse argv into the requested tag mutation. */
export const parseTagOverrides: (argv: WriteCommandArgv) => {
  readonly assign: Partial<TagData>;
  readonly clear: readonly (keyof TagData)[];
  readonly clearAll: boolean;
};

/** Apply assign + clear lists onto an existing TagData. */
export const applyOverrides: (current: TagData, overrides: TagOverrides) => TagData;

/** Rename-based atomic file write. */
export const writeAtomic: (path: string, bytes: Uint8Array) => Promise<void>;
```

## 依存

- Phase 1 (CLI 骨格、output / errors)
- Phase 2 (`formatTrack` の `--dry-run` での再利用、`runCli` テスト基盤)

## テスト方針

- `parseTagOverrides`:
  - 個別フラグだけ / `--json` だけ / 両方 (個別優先) / 数値型の境界 (`--year 0`、`--year 9999`) / 不正値 (`--year abc` → throw) / `--track 3` と `--track 3/12` / `--clear` 単独 / `--clear all` / `--clear title` と `--title "X"` の同時指定 (throw) を網羅。
- `applyOverrides`:
  - 既存タグ全部を残しつつ部分上書きできる
  - `--clear` で個別フィールドが落ちる
  - `clearAll` 後に assign すれば assign 値だけが残る
- `writeAtomic`:
  - 同名上書きで成功する
  - 書き出し中に throw された場合に元ファイルが残ること (failure injection)
  - 移動先パスのディレクトリが無い場合は throw する
- E2E:
  - `mme read` → `mme write --title X` → `mme read` のラウンドトリップで `tag.title === "X"`
  - `--dry-run` で filesystem が変わらない (`stat` の `mtime` が一致する)
  - `--output <path>` で別ファイルに書き出され、元は変更されない
  - `--stdin --format mp3 --output -` で stdout がバイト列を返す (stdout を Buffer で受ける runner 拡張が必要)
- 排他フラグ:
  - `<file> + --stdin` / `--clear title + --title X` / `--stdin + --clear title` / `--dry-run + --output -` はすべて exit code 2。

## 完了条件 (DoD)

- スカラー タグ全フィールドの読み書きが `mme read` / `mme write` でラウンドトリップする
- `--clear` / `--json` / `--tag-file` / `--output` / `--dry-run` / `--atomic` (既定 ON) が動く
- ストリーム モードで `cat in | mme write --stdin --format <fmt> --title X --output - > out` の pipeline が動く
- 全モードに対する E2E テストが緑
- `pnpm typecheck` / `pnpm test` / `pnpm check` が通る

## 参考資料

- core: `packages/core/src/api/saveTrack.ts`、`packages/core/src/api/writeMetadata.ts`
- core: `packages/core/src/types.ts` (`SaveTrackOptions` の挙動)
- 既存 CLI のフラグ命名:
  - eyeD3: `eyeD3 -t TITLE -a ARTIST -A ALBUM -G GENRE song.mp3`
  - mid3v2: `mid3v2 -t TITLE -a ARTIST song.mp3`
  - AtomicParsley: `AtomicParsley song.m4a --title "X" --artist "Y" --overWrite`
  - metaflac: `metaflac --remove-tag=ARTIST --set-tag="ARTIST=X" song.flac`
- 一括 JSON 編集: exiftool `-json` の往復 (`exiftool -json file > meta.json && exiftool -json=meta.json file`)
- atomic write の慣習: <https://lwn.net/Articles/457667/> (rename(2) on POSIX)
