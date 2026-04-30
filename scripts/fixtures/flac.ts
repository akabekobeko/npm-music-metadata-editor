import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildFlac } from "../../src/formats/flac/buildFlac/buildFlac.js";
import { buildMetadataBlock } from "../../src/formats/flac/buildFlac/buildMetadataBlock.js";
import {
  FLAC_METADATA_BLOCK_HEADER_SIZE,
  FLAC_SIGNATURE,
  FLAC_STREAMINFO_SIZE,
  FlacBlockType,
} from "../../src/formats/flac/constants.js";
import { parseFlac } from "../../src/formats/flac/parseFlac/parseFlac.js";
import type { FlacWritablePicture } from "../../src/formats/flac/types.js";

/**
 * Synthetic STREAMINFO block: 44.1 kHz / 16-bit / stereo / `totalSamples = 0`.
 *
 * The audio frames are dummies (a single zero byte) and FLAC decoders would
 * reject playback, but our reader / writer only inspects the metadata region
 * — that's all we need for round-trip tests.
 */
const buildStreamInfo = (): Uint8Array => {
  const out = Buffer.alloc(FLAC_STREAMINFO_SIZE);
  // minBlockSize = maxBlockSize = 4096
  out.writeUInt16BE(4096, 0);
  out.writeUInt16BE(4096, 2);
  // minFrameSize = maxFrameSize = 0 (unknown)
  out.writeUIntBE(0, 4, 3);
  out.writeUIntBE(0, 7, 3);
  // sampleRate = 44100, channels = 2, bitsPerSample = 16, totalSamples = 0
  // Pack the 64 bits manually.
  // sampleRate (20 bits): 44100 = 0xAC44 → bytes 10/11/12-high
  out[10] = (44100 >>> 12) & 0xff;
  out[11] = (44100 >>> 4) & 0xff;
  out[12] = ((44100 & 0x0f) << 4) | ((2 - 1) << 1) | (((16 - 1) >> 4) & 0x01);
  out[13] = ((16 - 1) & 0x0f) << 4; // top 4 bits of byte 13 hold rest of bps; low 4 bits are zero (totalSamples high)
  // bytes 14..17 already zero (totalSamples low)
  // bytes 18..33 already zero (md5)
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** A minimal blue PNG used as the dummy picture payload (1×1 px, RGB 0x0000FF). */
const BLUE_PNG: Uint8Array = Buffer.from(
  "89504e470d0a1a0a0000000d49484452000000010000000108020000009077533" +
    "de0000000c4944415478da6360000200000005000147bd31070000000049454e44ae426082",
  "hex",
);

/**
 * Build a minimal seed FLAC file with `"fLaC" + STREAMINFO(isLast) + 1 byte
 * of fake audio`. Round-trip generators then re-parse + rebuild to inject
 * Vorbis Comment / Picture blocks with the desired padding profile.
 */
const buildSeed = (): Uint8Array => {
  const streamInfoBlock = buildMetadataBlock({
    type: FlacBlockType.StreamInfo,
    data: buildStreamInfo(),
    isLast: true,
  });
  const audio = new Uint8Array([0x00]);
  const out = Buffer.concat([FLAC_SIGNATURE, streamInfoBlock, audio]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/flac");

/**
 * Build a FLAC fixture with the given Vorbis Comment + optional picture, plus
 * a fixed amount of padding so subsequent edits can fit in-place.
 */
const buildFixture = (args: {
  vendor: string;
  comments: readonly { key: string; value: string }[];
  picture?: FlacWritablePicture;
  paddingBytes: number;
}): Uint8Array => {
  const seed = buildSeed();
  const parsed = parseFlac(seed);
  // The seed has only STREAMINFO; we need to grow the metadata region so the
  // resulting fixture has the requested amount of padding. The simplest way
  // is to forge a `metadataRegionSize` that already includes the desired
  // padding budget — `rebalancePadding` will then size the new padding block
  // to fill the gap.
  const fakeAudioOffset = parsed.audioOffset + args.paddingBytes + FLAC_METADATA_BLOCK_HEADER_SIZE; // header for the (eventual) padding block
  return buildFlac({
    parsed: { ...parsed, audioOffset: fakeAudioOffset, metadataRegionSize: fakeAudioOffset },
    source: seed,
    vorbisComment: { vendor: args.vendor, comments: args.comments },
    pictures: args.picture === undefined ? [] : [args.picture],
  });
};

type FixtureSpec = {
  filename: string;
  bytes: Uint8Array;
  description: string;
};

/** Set of fixtures to generate. */
const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "basic.flac",
    description: "STREAMINFO + Vorbis Comment + 256B padding",
    bytes: buildFixture({
      vendor: "music-metadata-editor test",
      comments: [
        { key: "TITLE", value: "FLAC basic" },
        { key: "ARTIST", value: "Tester" },
        { key: "ALBUM", value: "Phase3 Album" },
        { key: "TRACKNUMBER", value: "2" },
        { key: "TRACKTOTAL", value: "10" },
        { key: "DATE", value: "2024-04-01" },
      ],
      paddingBytes: 256,
    }),
  },
  {
    filename: "with-picture.flac",
    description: "STREAMINFO + Vorbis Comment + PICTURE + 64B padding",
    bytes: buildFixture({
      vendor: "music-metadata-editor test",
      comments: [
        { key: "TITLE", value: "FLAC with picture" },
        { key: "ARTIST", value: "Tester" },
        { key: "ARTIST", value: "Tester (alternate)" },
        { key: "ALBUM", value: "Phase3 Album" },
      ],
      picture: {
        pictureType: 3, // cover front
        mimeType: "image/png",
        description: "",
        width: 1,
        height: 1,
        colorDepth: 24,
        colorNum: 0,
        data: BLUE_PNG,
      },
      paddingBytes: 64,
    }),
  },
  {
    filename: "tight-padding.flac",
    description: "Padding too small for an in-place tag growth",
    bytes: buildFixture({
      vendor: "music-metadata-editor test",
      comments: [{ key: "TITLE", value: "tight" }],
      paddingBytes: 0,
    }),
  },
];

const main = async (): Promise<void> => {
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const spec of FIXTURES) {
    const out = join(FIXTURES_DIR, spec.filename);
    await writeFile(out, spec.bytes);
    process.stdout.write(
      `wrote ${spec.filename} — ${spec.bytes.length} bytes (${spec.description})\n`,
    );
  }
};

await main();
