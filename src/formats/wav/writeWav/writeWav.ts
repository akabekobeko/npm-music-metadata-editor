import { Buffer } from "node:buffer";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type { Id3v2Frame, Id3v2MajorVersion } from "../../../tags/id3v2/types.js";
import { KNOWN_FRAME_IDS } from "../../../tags/id3v2/writeId3v2/knownFrameIds.js";
import { writeId3v2 } from "../../../tags/id3v2/writeId3v2/writeId3v2.js";
import type { WriteOptions } from "../../../types.js";
import { parseChunks } from "../../iff/parseChunks/parseChunks.js";
import { buildListInfoChunk } from "../buildListInfoChunk.js";
import {
  WAV_CHUNK_ID3,
  WAV_CHUNK_LIST,
  WAV_FORM_TYPE,
  WAV_HEADER_SIZE,
  WAV_MAGIC_RIFF,
} from "../constants.js";
import { detectWavSignature } from "../detectWav.js";
import { tagDataToInfoEntries } from "../tagDataToInfoEntries.js";

/** Chunk identifiers we own and rebuild from `options.tag` on every write. */
const REPLACED_CHUNK_IDS: ReadonlySet<string> = new Set([WAV_CHUNK_LIST, WAV_CHUNK_ID3]);

/**
 * Rewrite a RIFF/WAV file with new metadata.
 *
 * Strategy:
 * 1. Iterate the top-level chunks and collect the ones we don't manage
 *    (`fmt `, `data`, `bext`, `iXML`, …) verbatim, in original order.
 * 2. Read any existing `id3 ` chunk so we can preserve frames whose IDs are
 *    not synthesised from {@link TagData} (APIC, USLT, CHAP, …) — same
 *    contract as the MP3 writer.
 * 3. Build a fresh `LIST/INFO` chunk and a fresh `id3 ` chunk from
 *    `options.tag`.
 * 4. Concatenate `[RIFF header][structural chunks][LIST/INFO][id3 ]`. The
 *    metadata chunks land *after* `data`, which is allowed by the spec and
 *    keeps the audio offset stable for any consumer that already cached it.
 *
 * @param input - Original WAV bytes.
 * @param options - {@link WriteOptions} carrying the tag fields to merge in.
 * @returns Rebuilt file bytes ready to persist.
 * @throws when the leading bytes do not spell `RIFF...WAVE`.
 */
export const writeWav = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  if (!detectWavSignature(input)) {
    throw new Error("writeWav: input is not a RIFF/WAVE file");
  }

  const body = input.subarray(WAV_HEADER_SIZE);
  const chunks = parseChunks({ buffer: body, endianness: "little" });

  // The loop must keep iterating to collect every non-managed chunk into
  // `preservedChunks` below, so we can't break out on the first id3 hit.
  // Conformant WAV files carry at most one `id3 ` chunk; if a pathological
  // file contains several, the last one's payload wins — same convention
  // ATL.NET uses for its `id3v2Offset` field.
  const preservedChunks: Buffer[] = [];
  let existingId3Payload: Uint8Array | undefined;
  for (const chunk of chunks) {
    if (chunk.id === WAV_CHUNK_ID3) {
      existingId3Payload = body.subarray(
        chunk.payloadOffset,
        chunk.payloadOffset + chunk.payloadSize,
      );
      continue;
    }

    if (REPLACED_CHUNK_IDS.has(chunk.id)) {
      continue;
    }

    preservedChunks.push(Buffer.from(body.subarray(chunk.offset, chunk.offset + chunk.size)));
  }

  const id3Bytes = buildId3Chunk({ tag: options.tag, existing: existingId3Payload });
  const listBytes = buildListInfoChunk(tagDataToInfoEntries(options.tag));

  const totalBodySize =
    preservedChunks.reduce((sum, chunk) => sum + chunk.length, 0) +
    listBytes.length +
    id3Bytes.length +
    WAV_FORM_TYPE.length;

  const out = Buffer.alloc(8 + totalBodySize);
  out.set(WAV_MAGIC_RIFF, 0);
  out.writeUInt32LE(totalBodySize, 4);
  out.set(WAV_FORM_TYPE, 8);
  let cursor = WAV_HEADER_SIZE;
  for (const chunk of preservedChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }

  if (listBytes.length > 0) {
    out.set(listBytes, cursor);
    cursor += listBytes.length;
  }

  if (id3Bytes.length > 0) {
    out.set(id3Bytes, cursor);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Arguments for {@link buildId3Chunk}. */
type Args = {
  /** Tag fields the caller wants reflected in the new `id3 ` chunk. */
  tag: WriteOptions["tag"];
  /** Existing `id3 ` chunk payload (the ID3v2 tag bytes), if any. */
  existing: Uint8Array | undefined;
};

/**
 * Build the `id3 ` chunk to emit, or return an empty buffer when nothing
 * needs to be written.
 *
 * The chunk is emitted whenever the source file already contained one (so
 * round-tripping does not lose the tag) or whenever the caller supplied any
 * recognised tag field. The ID3v2 major version mirrors the source's version
 * when known, defaulting to v2.3 — the variant most editors emit.
 *
 * @returns The encoded chunk (header + payload + optional pad byte), or an
 *   empty `Uint8Array` when no chunk should be written.
 */
const buildId3Chunk = ({ tag, existing }: Args): Uint8Array => {
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
