import { readApeExtras } from "../../../extras/apeExtras/readApeExtras.js";
import { apeTagToTagData } from "../../../tags/ape/apeTagToTagData/apeTagToTagData.js";
import { readApeTag } from "../../../tags/ape/readApeTag/readApeTag.js";
import type { MetadataReadResult } from "../../../types.js";
import { parseApeHeader } from "../parseApeHeader/parseApeHeader.js";

/**
 * Read Monkey's Audio (`.ape`) metadata.
 *
 * The audio header is parsed for sanity (we reject buffers that don't look
 * like Monkey's Audio) and to derive `durationMs` from the sample-count and
 * sample-rate fields; tag content comes from the trailing APE tag.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated from the trailing APE tag,
 *   or empty fields when the file has no APE tag.
 */
export const readApe = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const apeTag = readApeTag(input);
  const tag = apeTag === undefined ? {} : apeTagToTagData(apeTag);
  const pictures = apeTag === undefined ? [] : readApeExtras(apeTag).pictures;
  const audioInfo = parseApeHeader(input);
  const durationMs =
    audioInfo === undefined || audioInfo.durationMs <= 0
      ? undefined
      : Math.round(audioInfo.durationMs);
  return {
    audioFormat: "ape",
    tag,
    pictures,
    chapters: [],
    ...(durationMs === undefined ? {} : { durationMs }),
  };
};
