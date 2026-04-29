import { Buffer } from "node:buffer";
import { ID3V1_NO_GENRE, ID3V1_TAG_SIZE } from "../../tags/id3v1/constants.js";
import type { Id3v1Tag } from "../../tags/id3v1/types.js";
import { writeId3v1 } from "../../tags/id3v1/writeId3v1.js";
import { readId3v2 } from "../../tags/id3v2/readId3v2.js";
import { writeId3v2 } from "../../tags/id3v2/writeId3v2.js";
import type { TagData, WriteOptions } from "../../types.js";
import { findMp3AudioEnd, findMp3AudioStart } from "./readMp3.js";

/**
 * Extra MP3-specific writer options layered on top of {@link WriteOptions}.
 *
 * Stored on `WriteOptions` itself via TypeScript's structural typing — callers
 * can pass any of these on the same options object they hand to {@link writeMetadata}.
 */
export type Mp3WriteOptions = {
  /**
   * Append (or refresh) an ID3v1 trailer in addition to the ID3v2 head tag.
   *
   * Defaults to `true` when an ID3v1 tag was present in the input, otherwise
   * `false`. Pass an explicit boolean to override either way.
   */
  includeId3v1?: boolean;
  /** ID3v2 major version to emit (`3` or `4`). Defaults to `3` for compatibility. */
  id3v2MajorVersion?: 3 | 4;
};

/**
 * Rewrite an MP3 file with new metadata.
 *
 * Strategy:
 * 1. Locate the audio payload (between the existing ID3v2 head and the
 *    optional ID3v1 trailer).
 * 2. Build a fresh ID3v2 tag from `tag`, preserving any unknown frames from
 *    the existing tag so APIC / USLT / CHAP round-trip even though Phase 2
 *    does not surface them via {@link MetadataReadResult}.
 * 3. Concatenate `[new ID3v2][audio][optional ID3v1]`.
 *
 * @param input - Original MP3 bytes.
 * @param options - {@link WriteOptions} (with optional MP3-specific extras).
 */
export const writeMp3 = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const mp3Options = options as WriteOptions & Mp3WriteOptions;
  const audioStart = findMp3AudioStart(input);
  const audioEnd = findMp3AudioEnd(input);
  const audio = input.subarray(audioStart, audioEnd);

  const existing = readId3v2(input);
  const knownFrameIds = new Set(buildKnownFrameIds());
  const preserved =
    existing === undefined
      ? []
      : existing.frames.filter((frame) => !knownFrameIds.has(frame.id) && frame.id !== "COMM");

  const majorVersion = mp3Options.id3v2MajorVersion ?? 3;
  const id3v2Bytes = writeId3v2({ majorVersion, tag: options.tag, preserveFrames: preserved });

  const includeV1 =
    mp3Options.includeId3v1 ?? (input.length >= ID3V1_TAG_SIZE && audioEnd < input.length);
  const id3v1Bytes = includeV1 ? writeId3v1(buildId3v1FromTag(options.tag)) : new Uint8Array();

  const out = Buffer.alloc(id3v2Bytes.length + audio.length + id3v1Bytes.length);
  out.set(id3v2Bytes, 0);
  out.set(audio, id3v2Bytes.length);
  if (id3v1Bytes.length > 0) {
    out.set(id3v1Bytes, id3v2Bytes.length + audio.length);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Frame IDs that we synthesize from `TagData`; preserve everything else verbatim. */
const buildKnownFrameIds = (): readonly string[] => [
  "TIT2",
  "TPE1",
  "TPE2",
  "TALB",
  "TCOM",
  "TPE3",
  "TEXT",
  "TPUB",
  "TCOP",
  "TCON",
  "TIT1",
  "TDES",
  "TLAN",
  "TSRC",
  "TYER",
  "TDRC",
  "TDOR",
  "TDRL",
  "TRCK",
  "TPOS",
  "TBPM",
];

/** Project a {@link TagData} value onto an {@link Id3v1Tag} for the trailer. */
const buildId3v1FromTag = (tag: Partial<TagData>): Id3v1Tag => ({
  minorVersion: tag.trackNumber === undefined ? 0 : 1,
  title: tag.title ?? "",
  artist: tag.artist ?? "",
  album: tag.album ?? "",
  year: tag.year === undefined ? "" : String(tag.year).padStart(4, "0").slice(0, 4),
  comment: tag.comment ?? "",
  ...(tag.trackNumber !== undefined ? { trackNumber: tag.trackNumber } : {}),
  ...(tag.genre !== undefined ? { genre: tag.genre } : {}),
  genreCode: ID3V1_NO_GENRE,
});
