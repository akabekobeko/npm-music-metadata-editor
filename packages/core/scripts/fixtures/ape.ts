import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APE_COMMON_HEADER_SIZE,
  APE_DESCRIPTOR_SIZE,
  APE_FILE_MAGIC,
  APE_NEW_HEADER_SIZE,
} from "../../src/formats/ape/constants.js";
import { ApeItemKind, ApeVersion } from "../../src/tags/ape/constants.js";
import type { ApeItem } from "../../src/tags/ape/types.js";
import { writeApeTag } from "../../src/tags/ape/writeApeTag/writeApeTag.js";

/** A minimal blue PNG used as the dummy cover-art payload (1×1 px, RGB 0x0000FF). */
const BLUE_PNG: Uint8Array = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009077533" +
    "de0000000c4944415478da6360000200000005000147bd31070000000049454e44ae426082",
  "hex",
);

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/ape");

/**
 * Build a synthetic Monkey's Audio header pair (descriptor + new header).
 *
 * The audio frames after this header are dummies (a single zero byte) — APE
 * decoders would reject playback, but our reader / writer only inspects the
 * header fields, which is enough for round-trip metadata tests.
 */
const buildApeAudioHeader = (): Uint8Array => {
  const out = Buffer.alloc(APE_COMMON_HEADER_SIZE + APE_DESCRIPTOR_SIZE + APE_NEW_HEADER_SIZE);
  out.set(APE_FILE_MAGIC, 0);
  // Version 3990 (3.99) — chooses the modern descriptor + new-header layout.
  out.writeUInt16LE(3990, APE_FILE_MAGIC.length);

  // Descriptor — only the size field is meaningful for our reader.
  // Layout: padded:u16 + nDescriptorBytes:u32 + ...
  let pos = APE_COMMON_HEADER_SIZE;
  out.writeUInt16LE(0, pos); // padded
  pos += 2;
  out.writeUInt32LE(APE_DESCRIPTOR_SIZE, pos); // nDescriptorBytes
  pos += 4;
  out.writeUInt32LE(APE_NEW_HEADER_SIZE, pos); // nHeaderBytes
  // Remaining descriptor fields (seek-table size, header-data size, frame
  // bytes, MD5) stay zero — they are informational.
  pos = APE_COMMON_HEADER_SIZE + APE_DESCRIPTOR_SIZE;

  // New header — fill in the audio-info fields.
  // nCompressionLevel:u16 (2000 = "Normal")
  out.writeUInt16LE(2000, pos);
  pos += 2;
  // nFormatFlags:u16
  out.writeUInt16LE(0, pos);
  pos += 2;
  // nBlocksPerFrame:u32 (73728 — typical for >= 3.95 SDK)
  out.writeUInt32LE(73728, pos);
  pos += 4;
  // nFinalFrameBlocks:u32
  out.writeUInt32LE(73728, pos);
  pos += 4;
  // nTotalFrames:u32
  out.writeUInt32LE(1, pos);
  pos += 4;
  // nBitsPerSample:u16
  out.writeUInt16LE(16, pos);
  pos += 2;
  // nChannels:u16
  out.writeUInt16LE(2, pos);
  pos += 2;
  // nSampleRate:u32
  out.writeUInt32LE(44100, pos);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** A single zero byte standing in for the compressed audio payload. */
const FAKE_AUDIO = new Uint8Array([0x00]);

type FixtureSpec = {
  filename: string;
  description: string;
  items: readonly ApeItem[];
  /** Whether to emit the optional v2 header in front of the items. */
  includeHeader?: boolean;
  /** Tag version (defaults to v2). */
  version?: typeof ApeVersion.V1 | typeof ApeVersion.V2;
};

/** Convenience to build a UTF-8 text item without spelling out the full shape. */
const text = (key: string, value: string): ApeItem => ({
  key,
  value,
  kind: ApeItemKind.Text,
  readOnly: false,
});

/** Build a binary cover-art item using {@link BLUE_PNG} as the payload. */
const coverArt = (): ApeItem => ({
  key: "Cover Art (Front)",
  value: BLUE_PNG,
  kind: ApeItemKind.Binary,
  readOnly: false,
});

const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "basic.ape",
    description: "MAC header + APE v2 tag with header",
    items: [
      text("Title", "APE basic"),
      text("Artist", "Tester"),
      text("Album", "Phase6 Album"),
      text("Track", "2/9"),
      text("Year", "2024"),
      text("Genre", "Rock"),
    ],
  },
  {
    filename: "with-picture.ape",
    description: "MAC header + APE v2 tag with cover art",
    items: [
      text("Title", "APE with picture"),
      text("Artist", "Tester"),
      text("Album", "Phase6 Album"),
      coverArt(),
    ],
  },
  {
    filename: "v1-no-header.ape",
    description: "MAC header + legacy APE v1 tag (footer only)",
    version: ApeVersion.V1,
    includeHeader: false,
    items: [text("Title", "APE v1"), text("Artist", "Tester"), text("Track", "1")],
  },
];

/** Combine MAC header + audio + tag and return the final bytes. */
const assemble = (spec: FixtureSpec): Uint8Array => {
  const audio = buildApeAudioHeader();
  const tag = writeApeTag({
    items: spec.items,
    version: spec.version ?? ApeVersion.V2,
    includeHeader: spec.includeHeader,
  });
  const out = Buffer.alloc(audio.length + FAKE_AUDIO.length + tag.length);
  out.set(audio, 0);
  out.set(FAKE_AUDIO, audio.length);
  out.set(tag, audio.length + FAKE_AUDIO.length);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

const main = async (): Promise<void> => {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const spec of FIXTURES) {
    const bytes = assemble(spec);
    const out = join(FIXTURES_DIR, spec.filename);
    await writeFile(out, bytes);
    process.stdout.write(`wrote ${spec.filename} — ${bytes.length} bytes (${spec.description})\n`);
  }
};

await main();
