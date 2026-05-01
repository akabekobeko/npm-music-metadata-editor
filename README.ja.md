[English](README.md)

# music-metadata-editor

[![Test](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml/badge.svg)](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml)

音楽ファイルのメタデータを読み書きする Node.js + TypeScript 製ライブラリです。クラスを使わない関数中心の API として設計されており、ESM と Node.js 24+ をファースト クラスでサポートします。

対応コンテナ / タグ形式:

| コンテナ | 読み込み | 書き込み | 補足 |
| --- | --- | --- | --- |
| MP3 | ✓ | ✓ | ID3v2.3 / 2.4 + APE Tag + ID3v1 |
| FLAC | ✓ | ✓ | Vorbis Comment + PICTURE block |
| MP4 / M4A | ✓ | ✓ | iTunes 形式の atom (`moov/udta/meta/ilst`) |
| OGG | ✓ | ✓ | Vorbis / Opus comment header |
| APE | ✓ | ✓ | Monkey's Audio + APE Tag v1/v2 |
| WAV (RIFF) | ✓ | ✓ | LIST INFO + BEXT + ID3 chunk |
| AIFF | ✓ | ✓ | ネイティブ annotation chunk + ID3 chunk |
| WMA / ASF | ✓ | ✓ | Content Description + Extended Content |

## インストール

```sh
pnpm add music-metadata-editor
# あるいは: npm install music-metadata-editor
```

Node.js 24 以降が必要です。

## クイック スタート

### トラックの読み込み

```ts
import { loadTrack } from "music-metadata-editor";

const track = await loadTrack("./song.mp3");
console.log(track.audioFormat);   // "mp3"
console.log(track.tag.title);     // "Hello"
console.log(track.tag.artist);    // "akabeko"
console.log(track.pictures.length);
```

`loadTrack` はファイル パス (`string`) と読み込み済みのバイト列 (`Uint8Array`) の両方を受け取れます。返される `Track` は Plain Object なので、編集はすべてスプレッド構文で行います。

### 編集したトラックの保存

```ts
import { loadTrack, saveTrack } from "music-metadata-editor";

const track = await loadTrack("./song.mp3");
const edited = {
  ...track,
  tag: { ...track.tag, title: "新しいタイトル", artist: "新しいアーティスト" },
};

// 元のファイルを上書き保存。
await saveTrack(edited, { source: "./song.mp3" });

// 別のパスへ書き出すこともできる。
await saveTrack(edited, { source: "./song.mp3", outputPath: "./out.mp3" });

// ディスクには触れずバイト列だけ再構築する場合。
const bytes = await saveTrack(edited, { source: await readFile("./song.mp3") });
```

### カバー アートの編集

```ts
import { loadTrack, saveTrack, PictureKind } from "music-metadata-editor";
import { readFile } from "node:fs/promises";

const track = await loadTrack("./song.mp3");
const cover = await readFile("./cover.jpg");
const edited = {
  ...track,
  pictures: [
    { mimeType: "image/jpeg", kind: PictureKind.CoverFront, data: cover },
  ],
};

await saveTrack(edited, { source: "./song.mp3" });
```

### 歌詞の編集

```ts
const edited = {
  ...track,
  lyrics: {
    language: "jpn",
    description: "Lyrics",
    unsynchronized: "1 行目\n2 行目\n",
  },
};

await saveTrack(edited, { source: "./song.mp3" });
```

同期歌詞を扱う場合は `lyrics.synchronized` に `{ timeMs, text }[]` を `timeMs` 昇順で渡してください。

## 2 層構造の API

| レイヤ | 関数 | 用途 |
| --- | --- | --- |
| 高レベル | `loadTrack`, `saveTrack` | 多くのケースで利用。`additionalFields` / `warnings` の既定値が補われた安定した `Track` Plain Object を返す。 |
| 低レベル | `readMetadata`, `writeMetadata` | 生の `MetadataReadResult` を扱いたい場合や `WriteOptions` を直接指定したい場合に使う。 |

両レイヤで同じ `ReadOptions` (例: MP3 の `tagPriority`) と `format` 強制オプション (拡張子やシグネチャから判定できないファイル向け) を共有します。

```ts
import { readMetadata } from "music-metadata-editor";

const result = await readMetadata("./song.mp3", { tagPriority: ["ape", "id3v2", "id3v1"] });
```

## エラーと警告

スローされる例外はすべて `MmeError` で、安定した `code` を持つタグ付き `Error` です:

```ts
import { loadTrack, isMmeError } from "music-metadata-editor";

try {
  await loadTrack("./mystery.bin");
} catch (error) {
  if (isMmeError(error) && error.code === "unsupported-format") {
    // ...
  }
}
```

| Code | 意味 |
| --- | --- |
| `unsupported-format` | フォーマットを検出できなかった、または該当する reader/writer が登録されていない。 |
| `invalid-tag` | タグ ブロックは見つかったが、バイト列が構造的に不正。 |
| `truncated-input` | 必要な構造を読み終える前に入力が終端した。 |
| `unsupported-feature` | 入力が未対応の機能 (例: 圧縮 / 暗号化) を使っている。 |

回復可能な問題 (有効なタグの中で 1 つだけ壊れた frame があるケースなど) はスローではなく `Track.warnings: readonly Warning[]` に non-fatal な diagnostic として収集されます。

## フィールド対応表

各タグ形式と共通 `TagData` の対応関係は [`docs/field-mapping.ja.md`](docs/field-mapping.ja.md) を参照してください。

## ドキュメント

- [`docs/README.ja.md`](docs/README.ja.md) — ドキュメント目次
- [`docs/rules/`](docs/rules) — コーディング / テスト / Git のルール
- [`docs/plan/`](docs/plan) — フェーズ単位の実装計画

## ライセンス

MIT © akabeko
