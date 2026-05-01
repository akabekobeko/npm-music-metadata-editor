import { Buffer } from "node:buffer";
import { readApeTag } from "../../../tags/ape/readApeTag/readApeTag.js";
import { tagDataToApeTag } from "../../../tags/ape/tagDataToApeTag/tagDataToApeTag.js";
import { writeApeTag } from "../../../tags/ape/writeApeTag/writeApeTag.js";
import { readId3v1 } from "../../../tags/id3v1/readId3v1/readId3v1.js";
import { writeId3v1 } from "../../../tags/id3v1/writeId3v1/writeId3v1.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import { KNOWN_FRAME_IDS } from "../../../tags/id3v2/writeId3v2/knownFrameIds.js";
import { writeId3v2 } from "../../../tags/id3v2/writeId3v2/writeId3v2.js";
import type { WriteOptions } from "../../../types.js";
import { findMp3AudioEnd } from "../readMp3/findMp3AudioEnd.js";
import { findMp3AudioStart } from "../readMp3/findMp3AudioStart.js";
import { buildId3v1FromTag } from "./buildId3v1FromTag.js";
import type { Mp3WriteOptions } from "./types.js";

/**
 * Rewrite an MP3 file with new metadata.
 *
 * Strategy:
 * 1. Locate the audio payload (between the existing ID3v2 head and any
 *    trailing APE / ID3v1 tag).
 * 2. Build a fresh ID3v2 tag from `tag`, preserving any unknown frames from
 *    the existing tag so APIC / USLT / CHAP round-trip even though Phase 2
 *    does not surface them via `MetadataReadResult`.
 * 3. When the source carried an APE Tag, refresh it from `tag` (keeping
 *    custom items intact) so the same fields land on every flavour. When it
 *    did not, no APE Tag is emitted.
 * 4. Concatenate `[new ID3v2][audio][optional new APE][optional new ID3v1]`.
 *
 * @param input - Original MP3 bytes.
 * @param options - {@link WriteOptions} (with optional MP3-specific extras).
 * @returns Rebuilt file bytes ready to persist.
 */
export const writeMp3 = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const mp3Options = options as WriteOptions & Mp3WriteOptions;
  const audioStart = findMp3AudioStart(input);
  const audioEnd = findMp3AudioEnd(input);
  const audio = input.subarray(audioStart, audioEnd);

  const existing = parseId3v2(input);
  const knownFrameIds = new Set(KNOWN_FRAME_IDS);
  const preserved =
    existing === undefined
      ? []
      : existing.frames.filter((frame) => !knownFrameIds.has(frame.id) && frame.id !== "COMM");

  const majorVersion = mp3Options.id3v2MajorVersion ?? 3;
  const id3v2Bytes = writeId3v2({ majorVersion, tag: options.tag, preserveFrames: preserved });

  const apeBytes = buildApeBytesIfPresent(input, options);
  const id3v1Bytes = buildId3v1BytesIfRequested({ input, options: mp3Options, tag: options.tag });

  const out = Buffer.alloc(id3v2Bytes.length + audio.length + apeBytes.length + id3v1Bytes.length);
  let cursor = 0;
  out.set(id3v2Bytes, cursor);
  cursor += id3v2Bytes.length;
  out.set(audio, cursor);
  cursor += audio.length;
  if (apeBytes.length > 0) {
    out.set(apeBytes, cursor);
    cursor += apeBytes.length;
  }

  if (id3v1Bytes.length > 0) {
    out.set(id3v1Bytes, cursor);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Synthesize the APE Tag bytes when the source MP3 carried one.
 *
 * The new tag mirrors the source's version + header presence so a v1 tag
 * stays a v1 tag and a v2 tag (with optional header) stays one — only the
 * field values are refreshed from `options.tag`.
 *
 * @param input - Original file bytes.
 * @param options - Public {@link WriteOptions} (the `tag` field is consumed).
 * @returns The encoded tag, or an empty array when no APE was present.
 */
const buildApeBytesIfPresent = (input: Uint8Array, options: WriteOptions): Uint8Array => {
  const existingApe = readApeTag(input);
  if (existingApe === undefined) {
    return new Uint8Array();
  }

  const apeTag = tagDataToApeTag({
    tag: options.tag,
    preserveItems: existingApe.items,
    version: existingApe.version,
    hasHeader: existingApe.hasHeader,
  });
  return writeApeTag({
    items: apeTag.items,
    version: apeTag.version,
    includeHeader: apeTag.hasHeader,
  });
};

/** Arguments for {@link buildId3v1BytesIfRequested}. */
type Id3v1Args = {
  /** Original file bytes. */
  input: Uint8Array;
  /** MP3 writer options (the `includeId3v1` flag is consulted). */
  options: Mp3WriteOptions;
  /** Tag fields to project into the ID3v1 trailer. */
  tag: WriteOptions["tag"];
};

/**
 * Decide whether to emit an ID3v1 trailer and synthesize its bytes.
 *
 * Default: emit when the source had one. The user can force either way via
 * `options.includeId3v1`.
 *
 * @returns The encoded trailer, or an empty array when not emitting.
 */
const buildId3v1BytesIfRequested = ({ input, options, tag }: Id3v1Args): Uint8Array => {
  const sourceHasId3v1 = readId3v1(input) !== undefined;
  const includeV1 = options.includeId3v1 ?? sourceHasId3v1;
  if (!includeV1) {
    return new Uint8Array();
  }

  return writeId3v1(buildId3v1FromTag(tag));
};
