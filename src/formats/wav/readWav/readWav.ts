import { id3v2TagToTagData } from "../../../tags/id3v2/id3v2TagToTagData/id3v2TagToTagData.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";
import type { MetadataReadResult, TagData } from "../../../types.js";
import { parseChunks } from "../../iff/parseChunks/parseChunks.js";
import { WAV_CHUNK_ID3, WAV_CHUNK_LIST, WAV_HEADER_SIZE } from "../constants.js";
import { detectWavSignature } from "../detectWav.js";
import { infoEntriesToTagData } from "../infoEntriesToTagData.js";
import { parseListInfo } from "../parseListInfo.js";

/**
 * Read RIFF/WAV (`.wav`) metadata.
 *
 * The reader iterates the top-level chunks following the `RIFF...WAVE`
 * header. INFO entries from the `LIST/INFO` chunk and frames from any
 * embedded `id3 ` (ID3v2) chunk are projected onto a common
 * {@link TagData}; when both are present, the ID3v2 fields take precedence
 * (matching the priority used by ATL.NET and most DAWs).
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated with the merged tag data.
 *   `pictures` / `chapters` / `lyrics` are not surfaced in Phase 7 (see
 *   Phase 9).
 * @throws when the leading bytes do not spell `RIFF...WAVE`.
 */
export const readWav = async (input: Uint8Array): Promise<MetadataReadResult> => {
  if (!detectWavSignature(input)) {
    throw new Error("readWav: input is not a RIFF/WAVE file");
  }

  const body = input.subarray(WAV_HEADER_SIZE);
  const chunks = parseChunks({ buffer: body, endianness: "little" });

  let infoTag: TagData = {};
  let id3Tag: TagData = {};
  for (const chunk of chunks) {
    if (chunk.id === WAV_CHUNK_LIST) {
      const payload = body.subarray(chunk.payloadOffset, chunk.payloadOffset + chunk.payloadSize);
      infoTag = infoEntriesToTagData(parseListInfo(payload));
      continue;
    }

    if (chunk.id === WAV_CHUNK_ID3) {
      const payload = body.subarray(chunk.payloadOffset, chunk.payloadOffset + chunk.payloadSize);
      const parsed = parseId3v2(payload);
      if (parsed !== undefined) {
        id3Tag = id3v2TagToTagData(parsed);
      }
    }
  }

  return {
    audioFormat: "wav",
    tag: { ...infoTag, ...id3Tag },
    pictures: [],
    chapters: [],
  };
};
