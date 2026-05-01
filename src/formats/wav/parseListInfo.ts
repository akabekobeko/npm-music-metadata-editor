import { Buffer } from "node:buffer";
import { decodeText } from "../../utils/encoding/decodeText.js";
import { WAV_LIST_PURPOSE_INFO } from "./constants.js";
import type { WavInfoEntry } from "./types.js";

/** Bytes consumed by an INFO sub-chunk header (4-byte key + 4-byte size). */
const SUBCHUNK_HEADER_SIZE = 8;

/**
 * Strip every trailing null byte from `bytes` before decoding.
 *
 * INFO entries are stored as null-terminated strings, but writers in the wild
 * are inconsistent about how many null bytes they emit (one for the
 * terminator, sometimes a second one for word alignment, rarely a few extra).
 * Trimming all of them avoids surfacing invisible NUL characters to callers.
 */
const stripTrailingNulls = (bytes: Uint8Array): Uint8Array => {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) {
    end--;
  }

  return bytes.subarray(0, end);
};

/**
 * Parse the entries inside a `LIST` chunk that carries the `INFO` purpose.
 *
 * The chunk payload starts with a 4-byte purpose marker (`"INFO"`); when the
 * marker is anything else (e.g. `"adtl"`) we return an empty array — adtl
 * sub-chunks carry cue-point labels rather than text metadata so they have no
 * place in our high-level {@link TagData} mapping.
 *
 * @param payload - Bytes of the `LIST` chunk's payload (after the chunk header).
 * @returns Decoded INFO entries in file order, or `[]` for non-INFO LIST chunks.
 */
export const parseListInfo = (payload: Uint8Array): readonly WavInfoEntry[] => {
  if (payload.length < 4) {
    return [];
  }

  const view = Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  if (view.toString("latin1", 0, 4) !== WAV_LIST_PURPOSE_INFO) {
    return [];
  }

  const entries: WavInfoEntry[] = [];
  let cursor = 4;
  while (cursor + SUBCHUNK_HEADER_SIZE <= view.length) {
    const key = view.toString("latin1", cursor, cursor + 4);
    const size = view.readUInt32LE(cursor + 4);
    const valueStart = cursor + SUBCHUNK_HEADER_SIZE;
    if (valueStart + size > view.length) {
      break;
    }

    const trimmed = stripTrailingNulls(payload.subarray(valueStart, valueStart + size));
    entries.push({ key, value: decodeText(trimmed, "utf8") });
    // Sub-chunks are word-aligned: skip one pad byte when the size is odd.
    cursor = valueStart + size + (size % 2);
  }

  return entries;
};
