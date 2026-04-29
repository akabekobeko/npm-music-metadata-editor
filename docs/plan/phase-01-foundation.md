# Phase 1: Foundation

## 目的

以降のフェーズが共通利用する **基盤層** を整備する。具体的には:

- 全フォーマット共通の `type` 定義
- バイナリ I/O ユーティリティ (Node.js `Buffer` を活用)
- フォーマット検出 (拡張子 + マジック ナンバー)
- 公開 API の骨格 (`read` / `write` のシグネチャ確定)
- ディレクトリ規約のファイナライズ

このフェーズが完了した時点では、まだ「どの形式も読めない」状態だが、Phase 2 以降の実装が同じ型と I/O ヘルパー上で素直に書き始められる状態を目指す。

## スコープ

### 共通 type 定義 (`src/types.ts`)

全モジュール共用の `type` は **`src/types.ts` 1 ファイル** に集約する (`docs/rules/types-and-constants.md`の方針)。

- `TagData` — 主要メタデータの集合 (title, artist, album, year, genre, trackNumber, ...)
- `AudioFormat` — コンテナ種別 + コーデック種別 (`'mp3' | 'flac' | 'mp4' | ...`) の as const + Union 型
- `PictureInfo` — 埋め込み画像 (mime, kind, description, data: Uint8Array)
- `ChapterInfo` — チャプター (start, end, title, ...)
- `LyricsInfo` — 歌詞 (synchronized / unsynchronized)
- `ReadOptions` / `WriteOptions` — 公開 API のオプション
- `MetadataReadResult` — 読み取り結果 (`tag`, `audioFormat`, `pictures`, `chapters`, `lyrics`)

すべての `type` には TSDoc を付ける。
グローバル定数が必要になった場合は `src/constants.ts` を新設する (Phase 1 時点では不要)。

### バイナリ I/O (`src/io/`)

Node.js `Buffer` を直接扱うのは煩雑なため、薄いラッパーを定義する:

- `BufferCursor` — 読み取り専用バッファ + 現在オフセット (Plain Object と function で実装。class は使わない)
  - `readUInt8` / `readUInt16BE` / `readUInt16LE` / `readUInt24BE` / `readUInt32BE` / `readUInt32LE` / `readSyncSafeInt32`
  - `readBytes(length)` — `Uint8Array` を返す (ゼロコピー スライス)
  - `readString(length, encoding)` — UTF-8 / Latin-1 / UTF-16 など
  - `readNullTerminated(encoding)` — null 終端文字列
  - `seek(offset)` / `skip(n)` / `peek(n)`
- `BufferWriter` — 可変サイズ ライタ (内部で `Buffer.alloc` + 拡張)
  - 読み取り側に対応する書き込みメソッド一式
  - `concat()` で `Buffer` を返す
- `readSyncSafeInt32` — ID3v2 の同期安全整数 (Phase 2 でも利用するが、ここで実装)

`BufferCursor` / `BufferWriter` 自体は Object として export し、生成は `createBufferCursor(buffer)` / `createBufferWriter()` のような factory function を介する。

### ファイル / ストリーム I/O (`src/io/file.ts`)

- `readFileBuffer(path)` — `fs/promises` の薄いラッパー
- ストリーミング読み取り (大容量ファイル対応) は **Phase 1 ではスコープ外**。Phase 10 で再検討する。

### フォーマット検出 (`src/formats/detect.ts`)

- `detectFormatByExtension(filePath)` — 拡張子マッピング
- `detectFormatBySignature(headerBytes)` — マジック ナンバー (例: `ID3` / `fLaC` / `OggS` / `RIFF` + `WAVE` / `FORM` + `AIFF` / `ftyp` 等)
- `detectFormat(input)` — 上記を統合 (パスかバッファを受け、署名優先で返す)

各検出器は **Phase 2 以降で対応形式を増やすたびに追記**できるよう、フォーマット → 検出関数のマッピング Object を介して登録する。

### 公開 API 骨格 (`src/index.ts`)

- `readMetadata(input: string | Uint8Array, options?: ReadOptions): Promise<MetadataReadResult>`
- `writeMetadata(input: string | Uint8Array, tag: Partial<TagData>, options?: WriteOptions): Promise<Uint8Array>`

Phase 1 ではどちらも `'unsupported format'` 相当のエラーを投げるスタブ実装で構わないが、シグネチャは確定する。

## 設計方針

- `class` 不使用。`createBufferCursor(buffer)` のような factory function が **Object** を返す。返り値の型は `type BufferCursor = { readUInt8: () => number; ... }` のように記述する。
- バイナリ操作は `Buffer` の API (`readUInt32BE` 等) を活用しつつ、必要な範囲に薄くラップする。
- 文字エンコーディングは Node.js 標準の `Buffer.from(data, 'utf8' | 'latin1' | 'utf16le' | 'ascii')` を基本とする。BOM 付き UTF-16 や ID3v2.4 の UTF-16BE は `TextDecoder` を併用する。

## 主要な公開 API (案)

```ts
/** Container + codec identifier. */
export type AudioFormat =
  | 'mp3'
  | 'flac'
  | 'mp4'
  | 'm4a'
  | 'ogg'
  | 'opus'
  | 'wav'
  | 'aiff'
  | 'wma'
  | 'ape';

/** Common metadata fields populated from any tag format. */
export type TagData = {
  title?: string;
  artist?: string;
  album?: string;
  // ...
};

/** Result of reading metadata from a file. */
export type MetadataReadResult = {
  audioFormat: AudioFormat;
  tag: TagData;
  pictures: readonly PictureInfo[];
  chapters: readonly ChapterInfo[];
  lyrics?: LyricsInfo;
};

/**
 * Read metadata from an audio file (path or in-memory buffer).
 * @throws when the format cannot be detected or is not yet supported.
 */
export const readMetadata: (
  input: string | Uint8Array,
  options?: ReadOptions,
) => Promise<MetadataReadResult>;
```

`writeMetadata` は Phase 2 以降で書き込み実装が揃うフォーマットから順に有効化する。

## ディレクトリ構成案

```
src/
  index.ts
  types.ts             # 全モジュール共用の type 定義 (TagData, AudioFormat, PictureInfo, ...)
  io/
    bufferCursor.ts
    bufferWriter.ts
    file.ts
  formats/
    detect.ts
    registry.ts        # format -> { detectSignature, read, write } のマッピング
  utils/
    encoding.ts        # TextDecoder ラッパー
    syncSafeInt.ts
```

> グローバルな定数が必要になった時点で `src/constants.ts` を新設する。サブモジュール (例: `tags/id3v2/`) 内で複数ファイルが共有する型/定数も、それぞれの階層に `types.ts` / `constants.ts` を置く方針 (`docs/rules/types-and-constants.md`)。

## 依存

- なし (このフェーズが基盤)

## テスト方針

- `BufferCursor` / `BufferWriter` は **読み書き対称性** をプロパティ ベースで検証 (write -> read で原データが復元する)
- `readSyncSafeInt32` は ID3v2 仕様の境界値 (`0x00000000`、`0x7F7F7F7F`) を対象にする
- `detectFormatBySignature` は各マジック ナンバーの正例 1 + 偽陽性となる近傍バイト列の負例を 1 ずつ
- 公開 API のスタブが想定通りエラーを投げるかを確認

## 完了条件 (DoD)

- 上記 type 定義、I/O ヘルパー、検出器、公開 API 骨格が `src/` に配置されている
- すべての追加コードに対応する `*.test.ts` がある
- `pnpm typecheck`、`pnpm test`、`pnpm exec biome check .` が通る
- `docs/rules/directory-structure.md` と本フェーズで決めた構成が一致している (ずれたら `directory-structure.md` を更新)

## 参考資料

- ATL.NET: `ATL/Utils/BufferedBinaryReader.cs`、`ATL/Utils/StreamUtils.cs`
- ATL.NET: `ATL/AudioData/AudioDataIOFactory.cs` (フォーマット検出)
- ATL.NET: `ATL/Entities/TagData.cs`、`ATL/Entities/AudioFormat.cs`
