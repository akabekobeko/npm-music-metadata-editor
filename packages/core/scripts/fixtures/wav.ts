import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildListInfoChunk } from "../../src/formats/wav/buildListInfoChunk.js";
import {
  WAV_CHUNK_DATA,
  WAV_CHUNK_ID3,
  WAV_FORM_TYPE,
  WAV_MAGIC_RIFF,
} from "../../src/formats/wav/constants.js";
import { writeId3v2 } from "../../src/tags/id3v2/writeId3v2/writeId3v2.js";

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/wav");

/**
 * Build a minimal `fmt ` chunk for 16-bit PCM, mono, 44.1 kHz. The audio
 * payload that follows is a few zero bytes — playable by anything that can
 * parse a WAV header even though the perceived sound is just silence.
 */
const buildFmtChunk = (): Uint8Array => {
  const out = Buffer.alloc(8 + 16);
  out.write("fmt ", 0, 4, "latin1");
  out.writeUInt32LE(16, 4);
  out.writeUInt16LE(1, 8); // PCM
  out.writeUInt16LE(1, 10); // mono
  out.writeUInt32LE(44_100, 12); // sample rate
  out.writeUInt32LE(44_100 * 2, 16); // bytes/sec = sample rate * block align
  out.writeUInt16LE(2, 20); // block align
  out.writeUInt16LE(16, 22); // bits per sample
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Build a tiny `data` chunk holding 8 zero bytes of PCM silence. */
const buildDataChunk = (): Uint8Array => {
  const samples = new Uint8Array(8);
  const out = Buffer.alloc(8 + samples.length);
  out.write(WAV_CHUNK_DATA, 0, 4, "latin1");
  out.writeUInt32LE(samples.length, 4);
  out.set(samples, 8);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Wrap the supplied chunks in a `RIFF...WAVE` container with the correct outer size. */
const wrapInRiff = (chunks: readonly Uint8Array[]): Uint8Array => {
  const bodySize = chunks.reduce((sum, chunk) => sum + chunk.length, WAV_FORM_TYPE.length);
  const out = Buffer.alloc(8 + bodySize);
  out.set(WAV_MAGIC_RIFF, 0);
  out.writeUInt32LE(bodySize, 4);
  out.set(WAV_FORM_TYPE, 8);
  let cursor = 12;
  for (const chunk of chunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Build an `id3 ` chunk wrapping the supplied ID3v2 tag bytes. */
const wrapId3Chunk = (tagBytes: Uint8Array): Uint8Array => {
  const padding = tagBytes.length % 2;
  const out = Buffer.alloc(8 + tagBytes.length + padding);
  out.write(WAV_CHUNK_ID3, 0, 4, "latin1");
  out.writeUInt32LE(tagBytes.length, 4);
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
    filename: "list-info.wav",
    description: "RIFF/WAVE with fmt + data + LIST/INFO metadata",
    buildBody: () => [
      buildFmtChunk(),
      buildDataChunk(),
      buildListInfoChunk([
        { key: "INAM", value: "WAV title" },
        { key: "IART", value: "WAV artist" },
        { key: "IPRD", value: "WAV album" },
        { key: "ICMT", value: "WAV comment" },
        { key: "ICRD", value: "2024" },
        { key: "ITRK", value: "3/8" },
      ]),
    ],
  },
  {
    filename: "id3.wav",
    description: "RIFF/WAVE with fmt + data + id3 chunk (ID3v2.3)",
    buildBody: () => [
      buildFmtChunk(),
      buildDataChunk(),
      wrapId3Chunk(
        writeId3v2({
          majorVersion: 3,
          tag: {
            title: "WAV id3 title",
            artist: "WAV id3 artist",
            album: "WAV id3 album",
            year: 2023,
            trackNumber: 4,
            trackTotal: 12,
          },
        }),
      ),
    ],
  },
  {
    filename: "list-and-id3.wav",
    description: "RIFF/WAVE with both LIST/INFO and id3 chunks (id3 should win on conflict)",
    buildBody: () => [
      buildFmtChunk(),
      buildDataChunk(),
      buildListInfoChunk([
        { key: "INAM", value: "Info title" },
        { key: "IART", value: "Info artist" },
        { key: "ICMT", value: "Info comment" },
      ]),
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
    const bytes = wrapInRiff(spec.buildBody());
    const out = join(FIXTURES_DIR, spec.filename);
    await writeFile(out, bytes);
    process.stdout.write(`wrote ${spec.filename} — ${bytes.length} bytes (${spec.description})\n`);
  }
};

await main();
