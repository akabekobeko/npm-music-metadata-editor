[Japanese](README.ja.md)

# music-metadata-editor

[![Test](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml/badge.svg)](https://github.com/akabekobeko/npm-music-metadata-editor/actions/workflows/test.yml)

A Node.js + TypeScript library for reading and writing audio file metadata. Designed as a function-only API (no classes) with first-class support for ESM and Node.js 24+.

Supported containers / tag formats:

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
pnpm add music-metadata-editor
# or: npm install music-metadata-editor
```

Requires Node.js 24 or newer.

## Quick start

### Load a track

```ts
import { loadTrack } from "music-metadata-editor";

const track = await loadTrack("./song.mp3");
console.log(track.audioFormat);   // "mp3"
console.log(track.tag.title);     // "Hello"
console.log(track.tag.artist);    // "akabeko"
console.log(track.durationMs);    // 215000 (or `undefined` when not derivable)
console.log(track.pictures.length);
```

`loadTrack` accepts either a file path (`string`) or pre-loaded bytes (`Uint8Array`). The returned `Track` is a Plain Object — every consumer mutation is done by spreading.

`durationMs` is a read-only audio-derived field: the reader computes it from sample-count / sample-rate / bitrate fields, and `saveTrack` never writes it back to the file (the writer recomputes it on the next read). It is `undefined` when the source does not carry the values needed (e.g. a stripped-down fixture or a streaming MP3 with no Xing/VBRI header).

### Save a modified track

```ts
import { loadTrack, saveTrack } from "music-metadata-editor";

const track = await loadTrack("./song.mp3");
const edited = {
  ...track,
  tag: { ...track.tag, title: "New Title", artist: "New Artist" },
};

// Overwrite the source file in place.
await saveTrack(edited, { source: "./song.mp3" });

// Or write to a different path.
await saveTrack(edited, { source: "./song.mp3", outputPath: "./out.mp3" });

// Or rebuild bytes without touching the disk.
const bytes = await saveTrack(edited, { source: await readFile("./song.mp3") });
```

### Edit cover art

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
import { readMetadata } from "music-metadata-editor";

const result = await readMetadata("./song.mp3", { tagPriority: ["ape", "id3v2", "id3v1"] });
```

## Errors and warnings

All thrown errors are `MmeError`, a tagged `Error` with a stable `code`:

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

| Code | Meaning |
| --- | --- |
| `unsupported-format` | Format could not be detected, or no reader/writer is registered. |
| `invalid-tag` | A tag block was found but its bytes were structurally invalid. |
| `truncated-input` | The input ended before a required structure could be read in full. |
| `unsupported-feature` | The input uses a feature not yet supported (e.g. compression / encryption). |

Recoverable problems (a single malformed frame in an otherwise valid tag, etc.) are surfaced as non-fatal `Track.warnings: readonly Warning[]` instead of throwing.

## Field mapping

The mapping between each tag format and the common `TagData` shape is documented in [`docs/field-mapping.md`](docs/field-mapping.md).

## Documentation

- [`docs/README.md`](docs/README.md) — documentation index
- [`docs/rules/`](docs/rules) — coding / testing / git rules
- [`docs/plan/`](docs/plan) — phase-by-phase implementation plan

## License

MIT © akabeko
