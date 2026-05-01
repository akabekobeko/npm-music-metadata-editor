import { Buffer } from "node:buffer";
import { encodeText } from "../../utils/encoding/encodeText.js";
import { WAV_CHUNK_LIST, WAV_LIST_PURPOSE_INFO } from "./constants.js";
import type { WavInfoEntry } from "./types.js";

/**
 * Build a `LIST` chunk carrying `INFO` sub-chunks for each entry.
 *
 * Each value is UTF-8 encoded, null-terminated, and word-aligned with a
 * trailing pad byte when its post-terminator length is odd. The chunk header
 * itself is also word-aligned (no pad byte is appended here — callers
 * concatenate the result with other chunks and the iterator skips pad bytes
 * automatically when they are placed by `parseChunks`).
 *
 * @param entries - INFO entries to emit. An empty array yields a zero-length result.
 * @returns The encoded `LIST/INFO` chunk bytes (header + payload + optional pad byte),
 *   or an empty `Uint8Array` when there are no entries to write.
 */
export const buildListInfoChunk = (entries: readonly WavInfoEntry[]): Uint8Array => {
  if (entries.length === 0) {
    return new Uint8Array();
  }

  const bodyParts: Buffer[] = [];
  bodyParts.push(Buffer.from(WAV_LIST_PURPOSE_INFO, "latin1"));
  for (const entry of entries) {
    const value = encodeText(entry.value, "utf8");
    const declaredSize = value.length + 1; // value + null terminator
    const padByte = declaredSize % 2;
    const subChunk = Buffer.alloc(8 + declaredSize + padByte);
    subChunk.write(entry.key.padEnd(4, " ").slice(0, 4), 0, 4, "latin1");
    subChunk.writeUInt32LE(declaredSize, 4);
    subChunk.set(value, 8);
    // Null terminator is implicit (Buffer.alloc zero-fills); the optional pad byte too.
    bodyParts.push(subChunk);
  }

  const body = Buffer.concat(bodyParts);
  const padding = body.length % 2;
  const out = Buffer.alloc(8 + body.length + padding);
  out.write(WAV_CHUNK_LIST, 0, 4, "latin1");
  out.writeUInt32LE(body.length, 4);
  out.set(body, 8);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
