import { Buffer } from "node:buffer";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type { Id3v2Frame, Id3v2MajorVersion } from "../../../tags/id3v2/types.js";
import { KNOWN_FRAME_IDS } from "../../../tags/id3v2/writeId3v2/knownFrameIds.js";
import { writeId3v2 } from "../../../tags/id3v2/writeId3v2/writeId3v2.js";
import type { WriteOptions } from "../../../types.js";
import { WAV_CHUNK_ID3 } from "../constants.js";

/** Arguments for {@link buildId3Chunk}. */
type Args = {
  /** Tag fields the caller wants reflected in the new `id3 ` chunk. */
  tag: WriteOptions["tag"];
  /** Existing `id3 ` chunk payload (the ID3v2 tag bytes), if any. */
  existing: Uint8Array | undefined;
};

/**
 * Build the WAV `id3 ` chunk to emit, or return an empty buffer when
 * nothing needs to be written.
 *
 * The chunk is emitted whenever the source file already contained one (so
 * round-tripping does not lose the tag) or whenever the caller supplied
 * any recognised tag field. The ID3v2 major version mirrors the source's
 * version when known, defaulting to v2.3 — the variant most editors emit.
 * Frames whose ID is not synthesised from {@link TagData} (APIC, USLT,
 * CHAP, …) are preserved verbatim, mirroring the MP3 writer's contract.
 *
 * @returns The encoded chunk (header + payload + optional pad byte), or an
 *   empty `Uint8Array` when no chunk should be written.
 */
export const buildId3Chunk = ({ tag, existing }: Args): Uint8Array => {
  const existingTag = existing === undefined ? undefined : parseId3v2(existing);
  const hasTagFields = Object.values(tag).some((value) => value !== undefined && value !== "");
  if (existingTag === undefined && !hasTagFields) {
    return new Uint8Array();
  }

  const known = new Set(KNOWN_FRAME_IDS);
  const preserveFrames: readonly Id3v2Frame[] =
    existingTag === undefined
      ? []
      : existingTag.frames.filter((frame) => !known.has(frame.id) && frame.id !== "COMM");

  const sourceVersion = existingTag?.majorVersion;
  const majorVersion: Id3v2MajorVersion =
    sourceVersion === 3 || sourceVersion === 4 ? sourceVersion : 3;
  const tagBytes = writeId3v2({ majorVersion, tag, preserveFrames });

  const padding = tagBytes.length % 2;
  const out = Buffer.alloc(8 + tagBytes.length + padding);
  out.write(WAV_CHUNK_ID3, 0, 4, "latin1");
  out.writeUInt32LE(tagBytes.length, 4);
  out.set(tagBytes, 8);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
