import { Buffer } from "node:buffer";
import { readApeTag } from "../../../tags/ape/readApeTag/readApeTag.js";
import { tagDataToApeTag } from "../../../tags/ape/tagDataToApeTag/tagDataToApeTag.js";
import { writeApeTag } from "../../../tags/ape/writeApeTag/writeApeTag.js";
import type { WriteOptions } from "../../../types.js";
import { findApeAudioRange } from "./findApeAudioRange.js";

/**
 * Rewrite a Monkey's Audio file with new metadata.
 *
 * Strategy:
 * 1. Locate the audio payload — everything between the `"MAC "` header at
 *    offset 0 and the trailing APE tag (when present).
 * 2. Build a fresh APE Tag from `options.tag`, preserving any existing items
 *    whose key isn't managed by the high-level mapping (binary cover-art
 *    items, custom keys, …).
 * 3. Concatenate `[audio][new APE Tag]`. Monkey's Audio does not allow
 *    leading metadata, so the tag always sits at the end of the file.
 *
 * @param input - Original file bytes.
 * @param options - {@link WriteOptions} carrying the tag fields to merge in.
 * @returns Rebuilt file bytes ready to persist.
 */
export const writeApe = async (input: Uint8Array, options: WriteOptions): Promise<Uint8Array> => {
  const range = findApeAudioRange(input);
  const audio = input.subarray(0, range.audioEnd);

  const existing = readApeTag(input);
  const apeTag = tagDataToApeTag({
    tag: options.tag,
    preserveItems: existing?.items,
    version: existing?.version,
    hasHeader: existing?.hasHeader ?? true,
  });
  const tagBytes = writeApeTag({
    items: apeTag.items,
    version: apeTag.version,
    includeHeader: apeTag.hasHeader,
  });

  const out = Buffer.concat([audio, tagBytes]);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
