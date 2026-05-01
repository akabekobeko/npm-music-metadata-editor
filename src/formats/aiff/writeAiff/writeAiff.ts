import { Buffer } from "node:buffer";
import type { WriteOptions } from "../../../types.js";
import { parseChunks } from "../../iff/parseChunks/parseChunks.js";
import { buildNativeChunks } from "../buildNativeChunks/buildNativeChunks.js";
import {
  AIFF_CHUNK_ANNO,
  AIFF_CHUNK_AUTH,
  AIFF_CHUNK_COPYRIGHT,
  AIFF_CHUNK_ID3,
  AIFF_CHUNK_NAME,
  AIFF_HEADER_SIZE,
  AIFF_MAGIC_FORM,
} from "../constants.js";
import { detectAiffSignature } from "../detectAiff/detectAiff.js";
import { buildId3Chunk } from "./buildId3Chunk.js";

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
