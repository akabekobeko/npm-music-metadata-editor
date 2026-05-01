import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { OggHeaderType } from "../../src/formats/ogg/constants.js";
import { chunkIntoSegments } from "../../src/formats/ogg/packet/chunkIntoSegments.js";
import { encodeOggPage } from "../../src/formats/ogg/page/encodeOggPage.js";
import {
  OPUS_HEAD_MAGIC,
  OPUS_TAGS_MAGIC,
  VORBIS_COMMENT_MAGIC,
  VORBIS_ID_MAGIC,
  VORBIS_SETUP_MAGIC,
} from "../../src/formats/ogg/streams/constants.js";
import type { VorbisComment } from "../../src/tags/vorbisComment/types.js";
import { writeVorbisComment } from "../../src/tags/vorbisComment/writeVorbisComment.js";

/** Path to the directory we write fixtures into. */
const FIXTURES_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../tests/fixtures/ogg");

/** Bitstream serial number used for both fixtures (arbitrary, just stable). */
const SERIAL_NUMBER = 0x12345678;

/**
 * Build a minimal Vorbis identification packet (30 bytes).
 *
 * Carries 44.1 kHz / 2-channel parameters; the bitrate / blocksize fields
 * are set to plausible values so libvorbis decoders treat the header as
 * structurally well-formed (even though the audio that follows is fake).
 */
const buildVorbisIdPacket = (): Uint8Array => {
  const out = Buffer.alloc(30);
  out.set(VORBIS_ID_MAGIC, 0);
  // vorbis_version = 0
  out.writeUInt32LE(0, 7);
  // channels = 2
  out.writeUInt8(2, 11);
  // sample_rate = 44100
  out.writeUInt32LE(44100, 12);
  // bitrate_maximum / nominal / minimum (signed) — leave at zero except nominal
  out.writeInt32LE(0, 16);
  out.writeInt32LE(128_000, 20);
  out.writeInt32LE(0, 24);
  // blocksize_0 = 8 (256 samples), blocksize_1 = 11 (2048 samples) — stored as 0xb8
  out.writeUInt8(0xb8, 28);
  // framing_bit = 1
  out.writeUInt8(0x01, 29);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Build a placeholder Vorbis setup packet.
 *
 * Real setup packets contain codebooks and are several KB long; for fixture
 * purposes we only need the magic prefix so our reader / writer pair can
 * detect, preserve and re-emit it.
 */
const buildVorbisSetupPacket = (): Uint8Array => {
  const body = new Uint8Array(64);
  // Stamp some non-zero data so the placeholder is easy to spot in hex dumps.
  for (let i = 0; i < body.length; i++) {
    body[i] = (i * 0x07) & 0xff;
  }

  const out = Buffer.concat([VORBIS_SETUP_MAGIC, body]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Build the comment packet bytes for a Vorbis stream. */
const buildVorbisCommentPacket = (tag: VorbisComment): Uint8Array => {
  const body = writeVorbisComment(tag);
  const out = Buffer.concat([VORBIS_COMMENT_MAGIC, body, new Uint8Array([0x01])]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Build the `OpusHead` identification packet (19 bytes, channel_mapping=0).
 *
 * `pre_skip` is set to 312 samples — the libopus default — and the
 * informational `input_sample_rate` is left at 48000 Hz.
 */
const buildOpusIdPacket = (): Uint8Array => {
  const out = Buffer.alloc(19);
  out.set(OPUS_HEAD_MAGIC, 0);
  out.writeUInt8(1, 8); // version
  out.writeUInt8(2, 9); // channel_count
  out.writeUInt16LE(312, 10); // pre_skip
  out.writeUInt32LE(48000, 12); // input_sample_rate
  out.writeInt16LE(0, 16); // output_gain
  out.writeUInt8(0, 18); // channel_mapping_family = 0
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Build the `OpusTags` comment packet bytes for an Opus stream. */
const buildOpusCommentPacket = (tag: VorbisComment): Uint8Array => {
  const body = writeVorbisComment(tag);
  const out = Buffer.concat([OPUS_TAGS_MAGIC, body]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Encode a single packet into one BOS page. Used to seed the identification
 * page (page sequence 0) of every fixture.
 */
const encodeBosPage = (packet: Uint8Array): Uint8Array =>
  encodeOggPage({
    headerType: OggHeaderType.BeginningOfStream,
    granulePosition: 0n,
    serialNumber: SERIAL_NUMBER,
    pageSequence: 0,
    segmentSizes: chunkIntoSegments(packet.length),
    payload: packet,
  });

/** Arguments for {@link encodeAudioPage}. */
type AudioPageArgs = {
  /** Raw audio packet bytes (any size). */
  packet: Uint8Array;
  /** Page sequence number to assign. */
  pageSequence: number;
  /** Granule position (codec-defined sample counter). */
  granulePosition: bigint;
};

/**
 * Build a single audio page that closes the logical bitstream.
 *
 * We mark the page as EOS so trailing readers (and anything that scans for
 * `0x04`) detect the end of the stream cleanly.
 */
const encodeAudioPage = ({ packet, pageSequence, granulePosition }: AudioPageArgs): Uint8Array =>
  encodeOggPage({
    headerType: OggHeaderType.EndOfStream,
    granulePosition,
    serialNumber: SERIAL_NUMBER,
    pageSequence,
    segmentSizes: chunkIntoSegments(packet.length),
    payload: packet,
  });

/**
 * Build a header-region page covering one or more packets.
 *
 * Used to place the comment (and Vorbis setup) packet onto pages with
 * sequential page numbers.
 */
const encodeHeaderPage = ({
  packets,
  pageSequence,
  isContinuation,
}: {
  packets: readonly Uint8Array[];
  pageSequence: number;
  isContinuation: boolean;
}): Uint8Array => {
  const segments: number[] = [];
  for (const packet of packets) {
    segments.push(...chunkIntoSegments(packet.length));
  }

  return encodeOggPage({
    headerType: isContinuation ? OggHeaderType.Continuation : 0,
    granulePosition: 0n,
    serialNumber: SERIAL_NUMBER,
    pageSequence,
    segmentSizes: segments,
    payload: Buffer.concat(packets) as Uint8Array,
  });
};

/** Arguments for {@link buildVorbisFixture}. */
type VorbisFixtureArgs = {
  /** Comment block to embed. */
  tag: VorbisComment;
  /** Bytes to use as the (placeholder) audio packet. */
  audio: Uint8Array;
};

/** Build a one-stream Ogg Vorbis file usable by both reader and writer tests. */
const buildVorbisFixture = ({ tag, audio }: VorbisFixtureArgs): Uint8Array => {
  const idPage = encodeBosPage(buildVorbisIdPacket());
  const headerPage = encodeHeaderPage({
    packets: [buildVorbisCommentPacket(tag), buildVorbisSetupPacket()],
    pageSequence: 1,
    isContinuation: false,
  });
  const audioPage = encodeAudioPage({
    packet: audio,
    pageSequence: 2,
    granulePosition: 1024n,
  });
  const out = Buffer.concat([idPage, headerPage, audioPage]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Arguments for {@link buildOpusFixture}. */
type OpusFixtureArgs = {
  /** Comment block to embed. */
  tag: VorbisComment;
  /** Bytes to use as the (placeholder) audio packet. */
  audio: Uint8Array;
};

/** Build a one-stream Ogg Opus file usable by both reader and writer tests. */
const buildOpusFixture = ({ tag, audio }: OpusFixtureArgs): Uint8Array => {
  const idPage = encodeBosPage(buildOpusIdPacket());
  const headerPage = encodeHeaderPage({
    packets: [buildOpusCommentPacket(tag)],
    pageSequence: 1,
    isContinuation: false,
  });
  const audioPage = encodeAudioPage({
    packet: audio,
    pageSequence: 2,
    granulePosition: 960n,
  });
  const out = Buffer.concat([idPage, headerPage, audioPage]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

type FixtureSpec = {
  filename: string;
  bytes: Uint8Array;
  description: string;
};

const FIXTURES: readonly FixtureSpec[] = [
  {
    filename: "vorbis-basic.ogg",
    description: "BOS Vorbis ID + comment + placeholder setup + dummy audio page",
    bytes: buildVorbisFixture({
      tag: {
        vendor: "music-metadata-editor test",
        comments: [
          { key: "TITLE", value: "OGG Vorbis basic" },
          { key: "ARTIST", value: "Tester" },
          { key: "ALBUM", value: "Phase5 Album" },
          { key: "TRACKNUMBER", value: "3" },
          { key: "TRACKTOTAL", value: "9" },
          { key: "DATE", value: "2024-05-01" },
        ],
      },
      audio: new Uint8Array([0x00]),
    }),
  },
  {
    filename: "vorbis-multipage.ogg",
    description: "Comment block large enough that the writer must span multiple pages on rewrite",
    bytes: buildVorbisFixture({
      tag: {
        vendor: "music-metadata-editor test",
        comments: [
          { key: "TITLE", value: "OGG Vorbis multipage" },
          { key: "ARTIST", value: "Tester" },
          // Pad the block so a tiny rewrite forces a re-paging exercise.
          { key: "DESCRIPTION", value: "x".repeat(600) },
        ],
      },
      audio: new Uint8Array([0x00]),
    }),
  },
  {
    filename: "opus-basic.opus",
    description: "BOS OpusHead + OpusTags + dummy audio page",
    bytes: buildOpusFixture({
      tag: {
        vendor: "music-metadata-editor test",
        comments: [
          { key: "TITLE", value: "Opus basic" },
          { key: "ARTIST", value: "Tester" },
          { key: "ALBUM", value: "Phase5 Album" },
          { key: "TRACKNUMBER", value: "1" },
        ],
      },
      audio: new Uint8Array([0x00]),
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
