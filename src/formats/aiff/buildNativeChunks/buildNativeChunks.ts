import { Buffer } from "node:buffer";
import type { TagData } from "../../../types.js";
import { encodeText } from "../../../utils/encoding/encodeText.js";
import {
  AIFF_CHUNK_ANNO,
  AIFF_CHUNK_AUTH,
  AIFF_CHUNK_COPYRIGHT,
  AIFF_CHUNK_NAME,
} from "../constants.js";
import { buildChunk } from "./buildChunk.js";

/**
 * Build the native AIFF metadata chunks (`NAME`, `AUTH`, `(c) `, `ANNO`)
 * that match the supplied {@link TagData}.
 *
 * Text is latin1-encoded — that is what the AIFF spec mandates for these
 * chunks; characters outside the latin1 range are replaced by their
 * lossy `Buffer.from(..., "latin1")` representation. Callers needing full
 * Unicode round-tripping should use the embedded `ID3 ` chunk instead.
 *
 * The `comment` field is split on newlines and emitted as one `ANNO` chunk
 * per line so that round-tripping `nativeTagsToTagData` → `buildNativeChunks`
 * preserves line counts.
 *
 * @param tag - Source tag fields.
 * @returns Concatenated chunk bytes in `NAME, AUTH, (c) , ANNO*` order.
 */
export const buildNativeChunks = (tag: Partial<TagData>): Uint8Array => {
  const parts: Uint8Array[] = [];
  if (tag.title !== undefined && tag.title !== "") {
    parts.push(buildChunk({ id: AIFF_CHUNK_NAME, payload: encodeText(tag.title, "latin1") }));
  }

  if (tag.artist !== undefined && tag.artist !== "") {
    parts.push(buildChunk({ id: AIFF_CHUNK_AUTH, payload: encodeText(tag.artist, "latin1") }));
  }

  if (tag.copyright !== undefined && tag.copyright !== "") {
    parts.push(
      buildChunk({ id: AIFF_CHUNK_COPYRIGHT, payload: encodeText(tag.copyright, "latin1") }),
    );
  }

  if (tag.comment !== undefined && tag.comment !== "") {
    for (const line of tag.comment.split("\n")) {
      parts.push(buildChunk({ id: AIFF_CHUNK_ANNO, payload: encodeText(line, "latin1") }));
    }
  }

  if (parts.length === 0) {
    return new Uint8Array();
  }

  const out = Buffer.concat(parts.map((part) => Buffer.from(part)));
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
