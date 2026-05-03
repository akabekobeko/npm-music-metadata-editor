import { Buffer } from "node:buffer";
import type { VorbisComment, VorbisCommentEntry } from "./types.js";

/** ASCII byte value of the `=` separator that splits each `KEY=VALUE` entry. */
const EQUALS_BYTE = 0x3d;

/**
 * Decode a Vorbis Comment block from a buffer.
 *
 * The block layout is `vendor_length:u32le + vendor:utf8 + comment_count:u32le +
 * (length:u32le + utf8)*`. The optional OGG framing bit is *not* read here —
 * callers that consume an OGG packet must trim it (or ignore it) before
 * calling this function.
 *
 * Malformed entries (no `=`, or empty key) are silently dropped: their bytes
 * are still consumed, mirroring the lenient behaviour of mainstream readers.
 *
 * @param buffer - Raw block bytes (without any container framing).
 * @returns The decoded vendor + comment entries.
 * @throws RangeError when a length prefix would extend past the end of `buffer`.
 */
export const readVorbisComment = (buffer: Uint8Array): VorbisComment => {
  const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (view.length < 4) {
    throw new RangeError("readVorbisComment: buffer too small for vendor length");
  }

  let pos = 0;
  const vendorLen = view.readUInt32LE(pos);
  pos += 4;
  if (pos + vendorLen > view.length) {
    throw new RangeError("readVorbisComment: vendor extends past buffer");
  }

  const vendor = view.toString("utf8", pos, pos + vendorLen);
  pos += vendorLen;

  if (pos + 4 > view.length) {
    throw new RangeError("readVorbisComment: missing comment count");
  }

  const count = view.readUInt32LE(pos);
  pos += 4;

  const comments: VorbisCommentEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (pos + 4 > view.length) {
      throw new RangeError(`readVorbisComment: missing length for comment ${i}`);
    }

    const len = view.readUInt32LE(pos);
    pos += 4;
    if (pos + len > view.length) {
      throw new RangeError(`readVorbisComment: comment ${i} extends past buffer`);
    }

    const slice = view.subarray(pos, pos + len);
    pos += len;

    const equalsIndex = slice.indexOf(EQUALS_BYTE);
    // A leading `=` (key would be empty) and missing `=` are both treated as
    // malformed entries — drop them but keep going so the rest of the block
    // still parses cleanly.
    if (equalsIndex <= 0) {
      continue;
    }

    comments.push({
      key: slice.toString("ascii", 0, equalsIndex),
      value: slice.toString("utf8", equalsIndex + 1, len),
    });
  }

  return { vendor, comments };
};
