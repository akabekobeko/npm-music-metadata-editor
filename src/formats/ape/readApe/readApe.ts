import { apeTagToTagData } from "../../../tags/ape/apeTagToTagData/apeTagToTagData.js";
import { readApeTag } from "../../../tags/ape/readApeTag/readApeTag.js";
import type { MetadataReadResult } from "../../../types.js";

/**
 * Read Monkey's Audio (`.ape`) metadata.
 *
 * The audio header is parsed for sanity (we reject buffers that don't look
 * like Monkey's Audio) but its payload is not surfaced via
 * {@link MetadataReadResult} in Phase 6 — the public API only exposes the
 * APE Tag fields. Audio-info exposure is deferred to Phase 10's high-level
 * Track API.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated from the trailing APE tag,
 *   or empty fields when the file has no APE tag.
 */
export const readApe = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const apeTag = readApeTag(input);
  const tag = apeTag === undefined ? {} : apeTagToTagData(apeTag);
  return {
    audioFormat: "ape",
    tag,
    pictures: [],
    chapters: [],
  };
};
