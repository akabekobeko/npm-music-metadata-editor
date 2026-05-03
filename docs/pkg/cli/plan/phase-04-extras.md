# Phase 4: Pictures / Chapters / Lyrics

## 目的

Phase 2-3 で扱わなかった **拡張メタデータ (画像 / 章 / 歌詞)** の操作サブコマンドを追加する。これらは引数だけでは表現しきれない (バイナリ ファイル / 構造化された配列) ため、`mme picture` / `mme chapter` / `mme lyrics` のサブコマンド ツリーとして切り出す。

## スコープ

### 共通方針

- 画像 / 章 / 歌詞それぞれの操作は `extract` / `set` / `clear` (or `get` / `set` / `clear`) の 3 動詞で揃える。`list` (一覧) は read 系の派生として `mme read --pretty` で十分賄えるため、原則別 verb は作らない。
- いずれも内部実装は **`loadTrack` → 編集 → `saveTrack`** の 3 ステップ。Phase 3 の `applyOverrides` と同じ位置付けで、各サブコマンドが受け持つのは「該当配列 / オブジェクトの組み立て」までとする。
- ストリーム モード (stdin / stdout) は **本フェーズではスコープ外**。pipeline で扱いにくいバイナリが多いため。Phase 5 以降で需要があれば再検討する。

### `mme picture extract <file>`

```
mme picture extract <file> --output <path> [--kind <kind>] [--index <n>]
```

- 既定では先頭 picture (`pictures[0]`) を `--output` に書き出す。
- `--kind cover-front` で picture kind 名 (`PictureKind` の小文字 kebab-case) で絞る。複数該当する場合は `--index <n>` で 0-based 選択。`--index` 単独でも使える。
- `<path>` の拡張子は **画像の MIME と一致させなくてもよい** (extract 時は raw bytes をそのまま書き出すだけ)。CLI が拡張子を補正したい場合は `--auto-extension` (省略時 false) で `.jpg` / `.png` を MIME から推定して `<path>` に append する。
- `--output -` で stdout に bytes を流す (binary-safe 出力)。

### `mme picture set <file>`

```
mme picture set <file> --input <path>
                       [--kind <kind>] [--mime <mime>] [--description <s>]
                       [--replace]
```

- 既定動作: 入力ファイル (`--input <path>` または `--input -` で stdin) を読み込み、新しい `PictureInfo` を **追加**する (`pictures` の末尾)。
- `--mime` 省略時は拡張子から推定 (`image/jpeg` / `image/png` / `image/gif` / `image/webp` の lookup)。推定できなければ exit code 2。
- `--kind` 省略時は `cover-front` (主要なユース ケース)。
- `--replace` を付けると **既存 pictures をすべて削除してから追加** (= 単一画像へ置き換え)。`--kind` を併用すると「同じ kind の画像だけ削除して追加」に絞る。
- 同一 (`kind`, `mime`, バイト同一) の picture が既に存在するときは `--replace` でなくとも追加せず exit code 0 で終わる (info を stderr に出す)。

### `mme picture clear <file>`

```
mme picture clear <file> [--kind <kind>] [--index <n>]
```

- 引数なしで全 pictures を削除。
- `--kind` で対象 kind のみ。`--index` で 0-based 単一削除。両方指定したら **AND** (= 該当 kind の中で n 番目)。

### `mme chapter list <file>`

- `--pretty` で:

  ```
  #  | start    | end      | title
  -- | -------- | -------- | --------------------
   0 | 00:00:00 | 00:01:23 | Intro
   1 | 00:01:23 | 00:03:45 | Verse 1
  ```

- 既定では JSON 配列。
- `mme read --pretty` でも要約されるが、章の頭尾を milliseconds で確認したい用途のため独立 verb を持つ。

### `mme chapter set <file>`

```
mme chapter set <file> --json <path>
```

- JSON 配列で **章を一括上書き**する。差分編集 verb (`add` / `update`) は本フェーズでは作らない (`jq` 等で前段加工する想定)。
- JSON は `ChapterInfo[]` の shape に従う:

  ```json
  [
    { "id": "ch1", "startMs": 0,    "endMs": 83000,  "title": "Intro" },
    { "id": "ch2", "startMs": 83000, "endMs": 225000, "title": "Verse 1" }
  ]
  ```

- 入力 JSON の validation (時間の単調増加 / `endMs > startMs` / `id` の一意性) を CLI 側で行い、不正なら exit code 2 + 何が悪いかを stderr に出す。

### `mme chapter clear <file>`

- 全章を削除。

### `mme lyrics get <file>`

```
mme lyrics get <file> [--format text | lrc | json]
```

- 既定 `text`: `unsynchronized` を stdout に流す (無ければ exit code 1)。
- `lrc`: `synchronized` を [.lrc 形式](https://en.wikipedia.org/wiki/LRC_(file_format)) で出力。
- `json`: `LyricsInfo` を JSON で出力。
- `--language` で複数歌詞のうち特定言語を選ぶ余地を残す (core が現状 1 件しか返さない場合は no-op)。

### `mme lyrics set <file>`

```
mme lyrics set <file> [--text <path> | --lrc <path> | --json <path>]
                      [--language <iso>] [--description <s>]
```

- 入力ソースは排他: `--text` / `--lrc` / `--json` のいずれか 1 つ。
- `--text -` / `--lrc -` / `--json -` で stdin 入力可。
- `--language` / `--description` は LyricsInfo の同名フィールドを上書き。
- `--lrc` 入力時は `synchronized` を組み立て、`unsynchronized` には ` `.join("\n") した平文も同時に格納する (フォーマット差吸収のため)。

### `mme lyrics clear <file>`

- 歌詞を削除。

### コマンド登録

```
src/commands/
  picture/
    picture.ts                # createPictureCommand(): Command (extract/set/clear をぶら下げる)
    extractPicture.ts
    setPicture.ts
    clearPicture.ts
    pickPicture.ts            # --kind / --index による検索 (純関数)
    pickPicture.test.ts
  chapter/
    chapter.ts
    listChapter.ts
    setChapter.ts
    clearChapter.ts
    validateChapters.ts
    validateChapters.test.ts
  lyrics/
    lyrics.ts
    getLyrics.ts
    setLyrics.ts
    clearLyrics.ts
    parseLrc.ts
    parseLrc.test.ts
    formatLrc.ts
    formatLrc.test.ts
```

## 設計方針

- 純粋なデータ変換 (`pickPicture`, `validateChapters`, `parseLrc`, `formatLrc`) と I/O (`extractPicture`, `setPicture`, …) を厳密に分け、テスト容易性を優先する。
- バイナリ書き出しは Phase 1 の output ヘルパーには載せず、各サブコマンド内で `fs.promises.writeFile` を直接使う (テキスト出力との衝突を避けるため)。
- `--input -` / `--output -` で stdin / stdout を扱うときは **バイナリ モード** (`process.stdin` を `Buffer` として concat、`process.stdout.write(bytes)` を直接呼ぶ)。pretty 出力 / ログとぶつからないよう、ログ系は stderr に閉じる。

## 主要な内部 API (案)

```ts
/** Pick a picture from `pictures` by --kind / --index. Returns undefined when not found. */
export const pickPicture: (
  pictures: readonly PictureInfo[],
  filter: { kind?: PictureKindValue; index?: number },
) => PictureInfo | undefined;

/** Validate a chapter list — throws MmeError-like on failure. */
export const validateChapters: (chapters: readonly ChapterInfo[]) => void;

/** Parse / format LRC text into ChapterInfo-like synchronized lyrics. */
export const parseLrc: (text: string) => readonly SynchronizedLyric[];
export const formatLrc: (lyrics: readonly SynchronizedLyric[]) => string;
```

## 依存

- Phase 1 (CLI 骨格、output / errors)
- Phase 3 (`saveTrack` 経由の書き戻し処理 / `--atomic` / `writeAtomic` 等の再利用)

## テスト方針

- `pickPicture`: 全画像 / kind 絞り / index 絞り / 両方 / 0 件のケース
- `validateChapters`: 正常 / `endMs <= startMs` / 順序逆転 / `id` 重複 / 空配列 (許容するか結論をフェーズ内で出す)
- `parseLrc` / `formatLrc`: ラウンドトリップ (`format → parse` で同値)、`[mm:ss.xx]` / `[mm:ss.xxx]` の両方
- E2E:
  - `mme picture set --input cover.jpg song.mp3` → `mme read song.mp3` で `pictures[0].mimeType === "image/jpeg"`、その後 `mme picture extract --output out.jpg song.mp3` で元 bytes と一致
  - `mme chapter set --json chapters.json song.mp3` → `mme chapter list song.mp3` で同じ JSON が返る
  - `mme lyrics set --lrc lyrics.lrc song.mp3` → `mme lyrics get --format lrc song.mp3` でラウンドトリップ
- バイナリ pipeline: `mme picture extract <file> --output -` の stdout を Buffer で受けて元と一致することを検証

### フィクスチャ

- Phase 2 で導入した `tests/fixtures/` を流用。Pictures / Chapters / Lyrics 入りの MP3 / FLAC / MP4 / OGG / WAV / AIFF / WMA / APE のうち、最低でも MP3 と FLAC の 2 形式を用意する (画像対応 / 章対応 / 歌詞対応の組み合わせを最小費用でカバーするため)。

## 完了条件 (DoD)

- `mme picture extract|set|clear` / `mme chapter list|set|clear` / `mme lyrics get|set|clear` がすべて動く
- 各サブコマンドの E2E テストが緑
- LRC / JSON のラウンドトリップが成立
- `pnpm typecheck` / `pnpm test` / `pnpm check` が通る

## 参考資料

- core: `packages/core/src/types.ts` (`PictureInfo` / `ChapterInfo` / `LyricsInfo` / `SynchronizedLyric`)
- core: `packages/core/src/extras/` (Phase 9 の歌詞 / 章 / 画像実装)
- 既存 CLI:
  - AtomicParsley: `--artwork PATH` / `--artwork REMOVE_ALL` (M4A 画像)
  - eyeD3: `--add-image FILE:TYPE[:DESCRIPTION]` / `--remove-images`
  - mid3v2: `--APIC FILE:TYPE:DESCRIPTION`
  - metaflac: `--import-picture-from=FILE` / `--export-picture-to=FILE`
  - eyeD3: `--add-chapter` / `--remove-all-chapters`
  - mid3v2: `--CHAP` / `--CTOC`
  - LRC 仕様: <https://en.wikipedia.org/wiki/LRC_(file_format)>
