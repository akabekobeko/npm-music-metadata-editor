import { vorbisCommentToTagData } from "../../../tags/vorbisComment/vorbisCommentToTagData/vorbisCommentToTagData.js";
import type { MetadataReadResult } from "../../../types.js";
import { parseOggHeaders } from "./parseOggHeaders.js";

/**
 * Read Ogg (Vorbis / Opus) metadata.
 *
 * Walks the page stream, decodes the comment packet, and projects the Vorbis
 * Comment fields onto our common {@link MetadataReadResult} shape. Pictures
 * embedded via `METADATA_BLOCK_PICTURE` are deferred to Phase 9 so the
 * `pictures` array is always empty for now.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated from the Vorbis Comment.
 */
export const readOgg = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const parsed = parseOggHeaders(input);
  const tag = vorbisCommentToTagData(parsed.vorbisComment);
  return {
    audioFormat: parsed.codecInfo.codec === "opus" ? "opus" : "ogg",
    tag,
    pictures: [],
    chapters: [],
  };
};
