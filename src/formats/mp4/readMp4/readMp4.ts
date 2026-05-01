import type { MetadataReadResult } from "../../../types.js";
import { parseMp4 } from "./parseMp4.js";
import { readBrands } from "./readBrands.js";
import { resolveMp4AudioFormat } from "./resolveMp4AudioFormat.js";

/**
 * Read MP4 / M4A metadata.
 *
 * Parses the atom tree, projects the iTunes ilst entries onto our common
 * {@link MetadataReadResult} shape, and surfaces the detected brand-derived
 * audio format. The audio data inside `mdat` is not touched.
 *
 * @param source - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated from the iTunes metadata.
 */
export const readMp4 = async (source: Uint8Array): Promise<MetadataReadResult> => {
  const parsed = parseMp4(source);
  const brands = readBrands(source, parsed.tree);
  return {
    audioFormat: resolveMp4AudioFormat(brands),
    tag: parsed.metadata.tag,
    pictures: parsed.metadata.pictures,
    chapters: [],
  };
};
