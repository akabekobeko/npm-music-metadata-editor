import { Buffer } from "node:buffer";
import { ID3V1_TAG_SIZE } from "../../../tags/id3v1/constants.js";
import { writeId3v1 } from "../../../tags/id3v1/writeId3v1/writeId3v1.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import { writeId3v2 } from "../../../tags/id3v2/writeId3v2/writeId3v2.js";
import type { WriteOptions } from "../../../types.js";
import { findMp3AudioEnd } from "../readMp3/findMp3AudioEnd.js";
import { findMp3AudioStart } from "../readMp3/findMp3AudioStart.js";
import { buildId3v1FromTag } from "./buildId3v1FromTag.js";
import { KNOWN_FRAME_IDS } from "./knownFrameIds.js";
import type { Mp3WriteOptions } from "./types.js";

/**
 * Rewrite an MP3 file with new metadata.
 *
 * Strategy:
 * 1. Locate the audio payload (between the existing ID3v2 head and the
 *    optional ID3v1 trailer).
 * 2. Build a fresh ID3v2 tag from `tag`, preserving any unknown frames from
 *    the existing tag so APIC / USLT / CHAP round-trip even though Phase 2
 *    does not surface them via `MetadataReadResult`.
 * 3. Concatenate `[new ID3v2][audio][optional ID3v1]`.
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
