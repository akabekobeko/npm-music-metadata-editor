import { Buffer } from "node:buffer";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type { Id3v2Frame, Id3v2MajorVersion } from "../../../tags/id3v2/types.js";
import { KNOWN_FRAME_IDS } from "../../../tags/id3v2/writeId3v2/knownFrameIds.js";
import { writeId3v2 } from "../../../tags/id3v2/writeId3v2/writeId3v2.js";
import type { WriteOptions } from "../../../types.js";
import { parseChunks } from "../../iff/parseChunks/parseChunks.js";
import { buildNativeChunks } from "../buildNativeChunks.js";
import {
  AIFF_CHUNK_ANNO,
  AIFF_CHUNK_AUTH,
  AIFF_CHUNK_COPYRIGHT,
  AIFF_CHUNK_ID3,
  AIFF_CHUNK_NAME,
  AIFF_HEADER_SIZE,
  AIFF_MAGIC_FORM,
} from "../constants.js";
import { detectAiffSignature } from "../detectAiff.js";

/** Chunk identifiers we own and rebuild from `options.tag` on every write. */
const REPLACED_CHUNK_IDS: ReadonlySet<string> = new Set([
  AIFF_CHUNK_NAME,
  AIFF_CHUNK_AUTH,
  AIFF_CHUNK_COPYRIGHT,
  AIFF_CHUNK_ANNO,
  AIFF_CHUNK_ID3,
]);

/**
 * Rewrite an AIFF file with new metadata.
 *
 * Strategy mirrors the WAV writer: preserve every chunk we don't manage
 * (`COMM`, `SSND`, `MARK`, `INST`, `COMT`, …) verbatim and rebuild the
 * native + ID3 chunks from `options.tag`. The original file's form type
 * (`AIFF` vs `AIFC`) is preserved so AIFC compression hints in `COMM`
 * stay valid.
 *
 * @param input - Original AIFF bytes.
 * @param options - {@link WriteOptions} carrying the tag fields to merge in.
 * @returns Rebuilt file bytes ready to persist.
 * @throws when the leading bytes do not spell `FORM ... AIFF` / `AIFC`.
 */
export const writeAiff = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  if (!detectAiffSignature(input)) {
    throw new Error("writeAiff: input is not a FORM/AIFF/AIFC file");
  }

  const formType = input.subarray(8, 12);
  const body = input.subarray(AIFF_HEADER_SIZE);
  const chunks = parseChunks({ buffer: body, endianness: "big" });

  // The loop must keep iterating to collect every non-ID3 chunk into
  // `preservedChunks` below, so we can't break out on the first ID3 hit.
  // Conformant AIFF files carry at most one `ID3 ` chunk; if a pathological
  // file contains several, the last one's payload wins — same convention
  // ATL.NET uses for its `HasEmbeddedID3v2` field.
  const preservedChunks: Buffer[] = [];
  let existingId3Payload: Uint8Array | undefined;
  for (const chunk of chunks) {
    if (chunk.id === AIFF_CHUNK_ID3) {
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

  const nativeBytes = buildNativeChunks(options.tag);
  const id3Bytes = buildId3Chunk({ tag: options.tag, existing: existingId3Payload });

  const totalBodySize =
    formType.length +
    preservedChunks.reduce((sum, chunk) => sum + chunk.length, 0) +
    nativeBytes.length +
    id3Bytes.length;

  const out = Buffer.alloc(8 + totalBodySize);
  out.set(AIFF_MAGIC_FORM, 0);
  out.writeUInt32BE(totalBodySize, 4);
  out.set(formType, 8);
  let cursor = AIFF_HEADER_SIZE;
  for (const chunk of preservedChunks) {
    out.set(chunk, cursor);
    cursor += chunk.length;
  }

  if (nativeBytes.length > 0) {
    out.set(nativeBytes, cursor);
    cursor += nativeBytes.length;
  }

  if (id3Bytes.length > 0) {
    out.set(id3Bytes, cursor);
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Arguments for {@link buildId3Chunk}. */
type Args = {
  /** Tag fields the caller wants reflected in the new `ID3 ` chunk. */
  tag: WriteOptions["tag"];
  /** Existing `ID3 ` chunk payload (the ID3v2 tag bytes), if any. */
  existing: Uint8Array | undefined;
};

/**
 * Build the `ID3 ` chunk to emit, or return an empty buffer when nothing
 * needs to be written.
 *
 * The chunk is emitted whenever the source already carried one or whenever
 * the caller supplied any recognised tag field; this matches the WAV
 * writer's contract.
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
  out.write(AIFF_CHUNK_ID3, 0, 4, "latin1");
  out.writeUInt32BE(tagBytes.length, 4);
  out.set(tagBytes, 8);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
