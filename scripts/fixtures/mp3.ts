import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { ID3V1_NO_GENRE, ID3V1_TAG_SIZE } from "../../src/tags/id3v1/constants.js";
import type { Id3v1Tag } from "../../src/tags/id3v1/types.js";
import { writeId3v1 } from "../../src/tags/id3v1/writeId3v1/writeId3v1.js";
import { buildCommentFrameBody } from "../../src/tags/id3v2/buildId3v2/buildCommentFrameBody/buildCommentFrameBody.js";
import { buildId3v2 } from "../../src/tags/id3v2/buildId3v2/buildId3v2.js";
import { buildTextFrameBody } from "../../src/tags/id3v2/buildId3v2/buildTextFrameBody.js";
import type { Id3v2Frame } from "../../src/tags/id3v2/types.js";

/**
 * Single MPEG-1 Layer III audio frame at 32 kbps, 44.1 kHz, mono.
 *
 * Size = `(144 * 32000) / 44100 = 104` bytes. Header bytes:
 * - 0xFF 0xFB → sync (11 bits) + MPEG 1 + Layer III + no CRC
 * - 0x14      → bitrate index 1 (32kbps), sample-rate index 0 (44.1kHz)
 * - 0xC4      → mono, copyright off, original on
 *
 * The remaining 100 bytes are zero-filled. This is *not* a strictly valid
 * MP3 audio body (silence requires Huffman-encoded data), but it is enough
 * for our metadata reader / writer to:
 *   1. Detect the frame sync at the right offset.
 *   2. Decode bitrate / sample-rate / channel mode.
 * which is all Phase 2 verifies.
 */
const SILENT_MP3_FRAME: Uint8Array = (() => {
  const out = new Uint8Array(104);
  out[0] = 0xff;
  out[1] = 0xfb;
  out[2] = 0x14;
  out[3] = 0xc4;
  return out;
})();

/** A minimal blue PNG used as the dummy APIC payload (1×1 px, RGB 0x0000FF). */
const BLUE_PNG: Uint8Array = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009077533" +
    "de0000000c4944415478da6360000200000005000147bd31070000000049454e44ae426082",
  "hex",
);

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/mp3");

type FixtureSpec = {
  /** Output filename (within `tests/fixtures/mp3/`). */
  filename: string;
  /** ID3v2 frames to embed at the head of the file. */
  id3v2Frames: readonly Id3v2Frame[];
  /** ID3v2 major version to write (`3` or `4`). */
  id3v2MajorVersion: 3 | 4;
  /** Optional ID3v1 trailer. */
  id3v1?: Id3v1Tag;
};

/** Build an `Id3v2Frame` quickly from a UTF-8 text frame ID. */
const textFrame = (id: string, text: string): Id3v2Frame => ({
  id,
  flags: noFlags(),
  data: buildTextFrameBody({ encoding: "utf8", text }),
});

/** Empty per-frame flag set used by the generator. */
const noFlags = () => ({
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
});

/** Build a `COMM` frame body with English language. */
const commentFrame = (text: string): Id3v2Frame => ({
  id: "COMM",
  flags: noFlags(),
  data: buildCommentFrameBody({
    encoding: "utf8",
    language: "eng",
    description: "",
    text,
  }),
});

/** Build a dummy `APIC` (cover art) frame containing the {@link BLUE_PNG} payload. */
const apicFrame = (): Id3v2Frame => {
  // APIC layout: <encoding:1><mime:asciiz><pictype:1><description:asciiz><data>
  const mime = Buffer.from("image/png\x00", "latin1");
  const description = Buffer.from("\x00", "latin1");
  const out = Buffer.alloc(1 + mime.length + 1 + description.length + BLUE_PNG.length);
  let pos = 0;
  out[pos] = 0x00; // Latin-1 encoding for the description.
  pos++;
  out.set(mime, pos);
  pos += mime.length;
  out[pos] = 0x03; // Picture type: cover (front)
  pos++;
  out.set(description, pos);
  pos += description.length;
  out.set(BLUE_PNG, pos);

  return {
    id: "APIC",
    flags: noFlags(),
    data: new Uint8Array(out.buffer, out.byteOffset, out.byteLength),
  };
};

/** Build a `USLT` frame body with the lazy-dog pangram. */
const lyricsFrame = (): Id3v2Frame => ({
  id: "USLT",
  flags: noFlags(),
  data: buildCommentFrameBody({
    encoding: "utf8",
    language: "eng",
    description: "",
    text: "the quick brown fox jumps over the lazy dog",
  }),
});

/** Sample id3v1 trailer for fixtures that include one. */
const sampleId3v1: Id3v1Tag = {
  minorVersion: 1,
  title: "Sample Title",
  artist: "Sample Artist",
  album: "Sample Album",
  year: "2024",
  comment: "Generated",
  trackNumber: 7,
  genreCode: 17, // Rock
};

/** Set of fixtures to generate. */
const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "v23-basic.mp3",
    id3v2MajorVersion: 3,
    id3v2Frames: [
      textFrame("TIT2", "v23 basic"),
      textFrame("TPE1", "Tester"),
      textFrame("TALB", "Phase2 Album"),
      textFrame("TRCK", "1/12"),
      textFrame("TYER", "2024"),
      commentFrame("ID3v2.3 sample"),
    ],
  },
  {
    filename: "v24-with-extras.mp3",
    id3v2MajorVersion: 4,
    id3v2Frames: [
      textFrame("TIT2", "v24 extras"),
      textFrame("TPE1", "Tester"),
      textFrame("TALB", "Phase2 Album"),
      textFrame("TRCK", "3/9"),
      textFrame("TPOS", "1/2"),
      textFrame("TDRC", "2024-04-01"),
      textFrame("TBPM", "120"),
      commentFrame("ID3v2.4 sample"),
      apicFrame(),
      lyricsFrame(),
    ],
  },
  {
    filename: "v23-with-id3v1.mp3",
    id3v2MajorVersion: 3,
    id3v2Frames: [
      textFrame("TIT2", "Both tags"),
      textFrame("TPE1", "Tester"),
      textFrame("TALB", "Phase2 Album"),
    ],
    id3v1: sampleId3v1,
  },
];

/** Combine ID3v2 + audio + optional ID3v1 trailer and return the final bytes. */
const assemble = (spec: FixtureSpec): Uint8Array => {
  const id3v2 = buildId3v2({
    majorVersion: spec.id3v2MajorVersion,
    frames: spec.id3v2Frames,
    padding: 32,
  });
  const id3v1 = spec.id3v1 === undefined ? new Uint8Array() : writeId3v1(spec.id3v1);
  const out = Buffer.alloc(id3v2.length + SILENT_MP3_FRAME.length + id3v1.length);
  out.set(id3v2, 0);
  out.set(SILENT_MP3_FRAME, id3v2.length);
  if (id3v1.length > 0) {
    out.set(id3v1, id3v2.length + SILENT_MP3_FRAME.length);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Generator entry point. Run via `pnpm fixtures:mp3`. */
const main = async (): Promise<void> => {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const spec of FIXTURES) {
    const bytes = assemble(spec);
    const out = join(FIXTURES_DIR, spec.filename);
    await writeFile(out, bytes);
    const tail = spec.id3v1 === undefined ? "" : ` + ID3v1 (${ID3V1_TAG_SIZE}B)`;
    process.stdout.write(`wrote ${spec.filename} — ${bytes.length} bytes${tail}\n`);
  }

  // Touch the unused export so the linter does not flag it when the file is
  // imported as a side-effecting script.
  void ID3V1_NO_GENRE;
};

await main();
