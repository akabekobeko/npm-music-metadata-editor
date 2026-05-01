# music-metadata-editor

[![Test](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml/badge.svg)](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

日本語 / [English](README.md)

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
console.log(track.durationMs);    // 215000 (取得できない場合は `undefined`)
console.log(track.pictures.length);
```

`loadTrack` はファイル パス (`string`) と読み込み済みのバイト列 (`Uint8Array`) の両方を受け取れます。返される `Track` は Plain Object なので、編集はすべてスプレッド構文で行います。

`durationMs` は音声データから算出される読み取り専用フィールドです。reader が sample 数 / サンプル レート / bitrate などから計算し、`saveTrack` でファイルへ書き戻されることはありません (次回読み込み時に再計算されます)。ソース側に必要な値が無い場合 (音声フレームを持たないフィクスチャなど) は `undefined` になります。

> **MP3 の注意点**: CBR (固定ビット レート) ストリームにのみ対応します。VBR (Xing / Info / VBRI ヘッダを伴う可変ビット レート) は解析しないため、VBR で符号化された MP3 では CBR ベースの近似値となり、実際の再生時間と一致しないことがあります。

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

## 参考資料

参考実装:

- [Zeugma440/atldotnet](https://github.com/Zeugma440/atldotnet) — 機能面の参考実装として参照している C# 製音声メタデータ ライブラリ。各フォーマット対応状況の互換性表は [Google Sheets](https://docs.google.com/spreadsheets/d/1Wo9ifsKbBloofdWCsoXziAtaS-QVjqci5aavAV8dt2U/) で公開されている。

仕様 / リファレンス資料:

- [ID3v2.3](https://id3.org/id3v2.3.0) / [ID3v2.4 構造](https://id3.org/id3v2.4.0-structure) / [ID3v2.4 フレーム](https://id3.org/id3v2.4.0-frames)
- [APE Tag (HydrogenAudio wiki)](https://wiki.hydrogenaud.io/index.php?title=APE_key) と [Monkey's Audio](https://www.monkeysaudio.com/)
- [FLAC フォーマット](https://xiph.org/flac/format.html) と [Vorbis Comment](https://xiph.org/vorbis/doc/v-comment.html)
- [RFC 3533 — Ogg Encapsulation](https://datatracker.ietf.org/doc/html/rfc3533) と [RFC 7845 — Ogg Encapsulation for Opus](https://datatracker.ietf.org/doc/html/rfc7845)
- [ISO/IEC 14496-12 — ISO Base Media File Format (MP4)](https://en.wikipedia.org/wiki/ISO/IEC_base_media_file_format) と [iTunes Metadata atoms (AtomicParsley)](https://atomicparsley.sourceforge.net/mpeg-4files.html)
- [RIFF (Wikipedia)](https://en.wikipedia.org/wiki/Resource_Interchange_File_Format) / [WAV `LIST/INFO`](https://www.recordingblogs.com/wiki/list-chunk-of-a-wave-file) / [AIFF (Wikipedia)](https://en.wikipedia.org/wiki/Audio_Interchange_File_Format)
- [Advanced Systems Format (ASF / WMA)](https://en.wikipedia.org/wiki/Advanced_Systems_Format)
