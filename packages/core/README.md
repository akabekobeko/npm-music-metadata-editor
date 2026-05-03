# @akabeko/music-metadata-editor

[![Test](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml/badge.svg)](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml) [![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

English / [Japanese](README.ja.md)

A Node.js + TypeScript library for reading and writing audio file metadata. Designed as a function-only API (no classes) with first-class support for ESM and Node.js 24+.

## Supported containers / tag formats:

| Container | Read | Write | Notes |
| --- | --- | --- | --- |
| MP3 | ✓ | ✓ | ID3v2.3 / 2.4 + APE Tag + ID3v1 |
| FLAC | ✓ | ✓ | Vorbis Comment + PICTURE block |
| MP4 / M4A | ✓ | ✓ | iTunes-style atoms (`moov/udta/meta/ilst`) |
| OGG | ✓ | ✓ | Vorbis / Opus comment headers |
| APE | ✓ | ✓ | Monkey's Audio + APE Tag v1/v2 |
| WAV (RIFF) | ✓ | ✓ | LIST INFO + BEXT + ID3 chunk |
| AIFF | ✓ | ✓ | Native annotation chunks + ID3 chunk |
| WMA / ASF | ✓ | ✓ | Content Description + Extended Content |

## Install

```sh
pnpm add @akabeko/music-metadata-editor
# or: npm install @akabeko/music-metadata-editor
```

Requires Node.js 24 or newer.

## Quick start

### Load a track

`loadTrack` accepts both a file path (`string`) and pre-loaded bytes (`Uint8Array`). The returned `Track` is a Plain Object.

```ts
import { loadTrack } from "@akabeko/music-metadata-editor";

const track = await loadTrack("./song.mp3");
console.log(track.audioFormat);   // "mp3"
console.log(track.tag.title);     // "Hello"
console.log(track.tag.artist);    // "akabeko"
console.log(track.durationMs);    // 215000 (or `undefined` when not derivable)
console.log(track.pictures.length);
```

`durationMs` is a read-only audio-derived field. The reader computes it from sample-count / sample-rate / bitrate fields, and `saveTrack` never writes it back to the file (the writer recomputes it on the next read).

It is `undefined` when the source does not carry the values needed (e.g. a stripped-down fixture with no audio frames).

> **MP3 caveat**:
> Only CBR streams are supported.
> VBR-encoded MP3 (Xing / Info / VBRI headers) is not parsed; on VBR files the returned duration is a CBR-based estimate, so it may diverge from the true playback time.

### Save a modified track

```ts
import { loadTrack, saveTrack } from "@akabeko/music-metadata-editor";

const track = await loadTrack("./song.mp3");
const edited = {
  ...track,
  tag: { ...track.tag, title: "New Title", artist: "New Artist" },
};

// Overwrite the source file in place
await saveTrack(edited, { source: "./song.mp3" });

// Or write to a different path
await saveTrack(edited, { source: "./song.mp3", outputPath: "./out.mp3" });

// Or rebuild bytes without writing to a file
const bytes = await saveTrack(edited, { source: await readFile("./song.mp3") });
```

### Edit cover art

```ts
import { loadTrack, saveTrack, PictureKind } from "@akabeko/music-metadata-editor";
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

### Edit lyrics

```ts
const edited = {
  ...track,
  lyrics: {
    language: "eng",
    description: "Lyrics",
    unsynchronized: "Hello, world\nLine two\n",
  },
};

await saveTrack(edited, { source: "./song.mp3" });
```

For synchronized lyrics, populate `lyrics.synchronized` with `{ timeMs, text }[]` (sorted by `timeMs`).

## Two-layer API

| Layer | Functions | When to use |
| --- | --- | --- |
| High-level | `loadTrack`, `saveTrack` | Most workflows. Returns a stable `Track` Plain Object with `additionalFields` / `warnings` defaults. |
| Low-level | `readMetadata`, `writeMetadata` | When you need the raw `MetadataReadResult` or want to pass `WriteOptions` directly. |

Both layers honour the same `ReadOptions` (e.g. `tagPriority` for MP3) and `format` override for files without recognizable extensions or signatures.

```ts
import { readMetadata } from "@akabeko/music-metadata-editor";

const result = await readMetadata("./song.mp3", { tagPriority: ["ape", "id3v2", "id3v1"] });
```

## Errors and warnings

All thrown errors are `MmeError`, a tagged `Error` with a defined `code`.

```ts
import { loadTrack, isMmeError } from "@akabeko/music-metadata-editor";

try {
  await loadTrack("./mystery.bin");
} catch (error) {
  if (isMmeError(error) && error.code === "unsupported-format") {
    // ...
  }
}
```

| Code | Meaning |
| --- | --- |
| `unsupported-format` | Format could not be detected, or no reader/writer is registered. |
| `invalid-tag` | A tag block was found but its bytes were structurally invalid. |
| `truncated-input` | The input ended before a required structure could be read in full. |
| `unsupported-feature` | The input uses a feature not yet supported (e.g. compression / encryption). |

Recoverable problems do not throw — they are collected as non-fatal diagnostics on `Track.warnings: readonly Warning[]`. For example, a single malformed frame inside an otherwise valid tag falls into this category.

## Field mapping

The mapping between each tag format and the common `TagData` shape is documented in [`docs/field-mapping.md`](docs/field-mapping.md).

## Documentation

- [`docs/README.md`](docs/README.md) — documentation index
- [`docs/rules/`](docs/rules) — coding / testing / git rules
- [`docs/plan/`](docs/plan) — phase-by-phase implementation plan

## References

Reference implementation:

- [Zeugma440/atldotnet](https://github.com/Zeugma440/atldotnet)
  - C# audio-metadata library used as the behavioural reference for this project.
  - Cross-format compatibility table: [Google Sheet](https://docs.google.com/spreadsheets/d/1Wo9ifsKbBloofdWCsoXziAtaS-QVjqci5aavAV8dt2U/)

Specifications and supporting documentation:

- [ID3v2.3](https://id3.org/id3v2.3.0) / [ID3v2.4 structure](https://id3.org/id3v2.4.0-structure) / [ID3v2.4 frames](https://id3.org/id3v2.4.0-frames)
- [APE Tag (HydrogenAudio wiki)](https://wiki.hydrogenaud.io/index.php?title=APE_key) and [Monkey's Audio](https://www.monkeysaudio.com/)
- [FLAC format](https://xiph.org/flac/format.html) and [Vorbis Comment](https://xiph.org/vorbis/doc/v-comment.html)
- [RFC 3533 — Ogg Encapsulation](https://datatracker.ietf.org/doc/html/rfc3533) and [RFC 7845 — Ogg Encapsulation for Opus](https://datatracker.ietf.org/doc/html/rfc7845)
- [ISO/IEC 14496-12 — ISO Base Media File Format (MP4)](https://en.wikipedia.org/wiki/ISO/IEC_base_media_file_format) and [iTunes Metadata atoms (AtomicParsley)](https://atomicparsley.sourceforge.net/mpeg-4files.html)
- [RIFF (Wikipedia)](https://en.wikipedia.org/wiki/Resource_Interchange_File_Format), [WAV `LIST/INFO`](https://www.recordingblogs.com/wiki/list-chunk-of-a-wave-file), and [AIFF (Wikipedia)](https://en.wikipedia.org/wiki/Audio_Interchange_File_Format)
- [Advanced Systems Format (ASF / WMA)](https://en.wikipedia.org/wiki/Advanced_Systems_Format)
