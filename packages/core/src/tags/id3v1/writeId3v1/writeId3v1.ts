import { Buffer } from "node:buffer";
import { ID3V1_MAGIC, ID3V1_TAG_SIZE } from "../constants.js";
import type { Id3v1Tag } from "../types.js";
import { clampTrack } from "./clampTrack.js";
import { resolveGenreByte } from "./resolveGenreByte.js";
import { writeFixed } from "./writeFixed.js";

/**
 * Build the 128-byte ID3v1 trailer for the given tag.
 *
 * Strings are truncated to fit; UTF-8-only characters are dropped silently
 * because ID3v1 fields are Latin-1 only. When `tag.minorVersion` is `1` the
 * comment is limited to 28 bytes and the track number is emitted at offset 126.
 *
 * @param tag - Tag fields to encode.
 * @returns Exactly {@link ID3V1_TAG_SIZE} bytes ready to append to a file.
 */
export const writeId3v1 = (tag: Id3v1Tag): Uint8Array => {
  const out = Buffer.alloc(ID3V1_TAG_SIZE, 0);
  out.set(ID3V1_MAGIC, 0);
  writeFixed({ out, offset: 3, length: 30, value: tag.title });
  writeFixed({ out, offset: 33, length: 30, value: tag.artist });
  writeFixed({ out, offset: 63, length: 30, value: tag.album });
  writeFixed({ out, offset: 93, length: 4, value: tag.year });

  if (tag.minorVersion === 1) {
    writeFixed({ out, offset: 97, length: 28, value: tag.comment });
    out[125] = 0x00;
    out[126] = clampTrack(tag.trackNumber);
  } else {
    writeFixed({ out, offset: 97, length: 30, value: tag.comment });
  }

  out[127] = resolveGenreByte(tag);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
