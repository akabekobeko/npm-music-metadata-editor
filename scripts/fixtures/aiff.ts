import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildNativeChunks } from "../../src/formats/aiff/buildNativeChunks.js";
import {
  AIFF_CHUNK_COMM,
  AIFF_CHUNK_ID3,
  AIFF_CHUNK_SSND,
  AIFF_FORM_TYPE_AIFF,
  AIFF_MAGIC_FORM,
} from "../../src/formats/aiff/constants.js";
import { writeId3v2 } from "../../src/tags/id3v2/writeId3v2/writeId3v2.js";

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/aiff");

/**
 * IEEE 754 80-bit extended-precision big-endian encoding of `44100.0`.
 *
 * Values produced via the Apple SANE / IEEE conversion in
 * `aiff` reference encoders. Hard-coded so the fixture script does not
 * need to import a third-party encoder.
 */
const SAMPLE_RATE_44100_EXT80_BE = new Uint8Array([
  0x40, 0x0e, 0xac, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

/** Build the mandatory `COMM` chunk: mono, 16-bit, 44.1 kHz, 4 sample frames. */
const buildCommChunk = (): Uint8Array => {
  const out = Buffer.alloc(8 + 18);
  out.write(AIFF_CHUNK_COMM, 0, 4, "latin1");
  out.writeUInt32BE(18, 4);
  out.writeInt16BE(1, 8); // numChannels
  out.writeUInt32BE(4, 10); // numSampleFrames
  out.writeInt16BE(16, 14); // sampleSize (bits)
  out.set(SAMPLE_RATE_44100_EXT80_BE, 16);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Build a tiny `SSND` chunk holding 8 zero bytes of PCM silence. */
const buildSsndChunk = (): Uint8Array => {
  // SSND payload = 4-byte offset + 4-byte block size + sample bytes.
  const samples = new Uint8Array(8);
  const out = Buffer.alloc(8 + 8 + samples.length);
  out.write(AIFF_CHUNK_SSND, 0, 4, "latin1");
  out.writeUInt32BE(8 + samples.length, 4);
  // offset = 0, blockSize = 0
  out.set(samples, 16);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Wrap the supplied chunks in a `FORM ... AIFF` container with the correct outer size. */
const wrapInForm = (chunks: readonly Uint8Array[]): Uint8Array => {
  const bodySize = chunks.reduce((sum, chunk) => sum + chunk.length, AIFF_FORM_TYPE_AIFF.length);
  const out = Buffer.alloc(8 + bodySize);
  out.set(AIFF_MAGIC_FORM, 0);
  out.writeUInt32BE(bodySize, 4);
  out.set(AIFF_FORM_TYPE_AIFF, 8);
  let cursor = 12;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Build an `ID3 ` chunk wrapping the supplied ID3v2 tag bytes. */
const wrapId3Chunk = (tagBytes: Uint8Array): Uint8Array => {
  const padding = tagBytes.length % 2;
  const out = Buffer.alloc(8 + tagBytes.length + padding);
  out.write(AIFF_CHUNK_ID3, 0, 4, "latin1");
  out.writeUInt32BE(tagBytes.length, 4);
  out.set(tagBytes, 8);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

type FixtureSpec = {
  filename: string;
  description: string;
  buildBody: () => readonly Uint8Array[];
};

const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "native.aiff",
    description: "FORM/AIFF with COMM + SSND + native NAME/AUTH/(c)/ANNO chunks",
    buildBody: () => [
      buildCommChunk(),
      buildSsndChunk(),
      buildNativeChunks({
        title: "AIFF title",
        artist: "AIFF artist",
        copyright: "(C) 2024 Tester",
        comment: "first annotation\nsecond annotation",
      }),
    ],
  },
  {
    filename: "id3.aiff",
    description: "FORM/AIFF with COMM + SSND + ID3 chunk (ID3v2.3)",
    buildBody: () => [
      buildCommChunk(),
      buildSsndChunk(),
      wrapId3Chunk(
        writeId3v2({
          majorVersion: 3,
          tag: {
            title: "AIFF id3 title",
            artist: "AIFF id3 artist",
            album: "AIFF id3 album",
            year: 2023,
            trackNumber: 5,
            trackTotal: 9,
          },
        }),
      ),
    ],
  },
  {
    filename: "native-and-id3.aiff",
    description: "FORM/AIFF with both native and ID3 chunks (ID3 should win on conflict)",
    buildBody: () => [
      buildCommChunk(),
      buildSsndChunk(),
      buildNativeChunks({
        title: "Native title",
        artist: "Native artist",
      }),
      wrapId3Chunk(
        writeId3v2({
          majorVersion: 3,
          tag: { title: "Id3 title", artist: "Id3 artist" },
        }),
      ),
    ],
  },
];

const main = async (): Promise<void> => {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const spec of FIXTURES) {
    const bytes = wrapInForm(spec.buildBody());
    const out = join(FIXTURES_DIR, spec.filename);
    await writeFile(out, bytes);
    process.stdout.write(`wrote ${spec.filename} — ${bytes.length} bytes (${spec.description})\n`);
  }
};

await main();
