import { readVorbisCommentLyrics } from "../../../extras/vorbisCommentExtras/readVorbisCommentLyrics.js";
import { readVorbisCommentPictures } from "../../../extras/vorbisCommentExtras/readVorbisCommentPictures.js";
import { vorbisCommentToTagData } from "../../../tags/vorbisComment/vorbisCommentToTagData/vorbisCommentToTagData.js";
import type { MetadataReadResult } from "../../../types.js";
import { parseOggHeaders } from "./parseOggHeaders.js";

/**
 * Read Ogg (Vorbis / Opus) metadata.
 *
 * Walks the page stream, decodes the comment packet, and projects the Vorbis
 * Comment fields onto our common {@link MetadataReadResult} shape. Pictures
 * embedded via `METADATA_BLOCK_PICTURE` and lyrics carried via the `LYRICS`
 * key are surfaced through the public API.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated from the Vorbis Comment.
 */
export const readOgg = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const parsed = parseOggHeaders(input);
  const tag = vorbisCommentToTagData(parsed.vorbisComment);
  const pictures = readVorbisCommentPictures(parsed.vorbisComment);
  const lyrics = readVorbisCommentLyrics(parsed.vorbisComment);
  return {
    audioFormat: parsed.codecInfo.codec === "opus" ? "opus" : "ogg",
    tag,
    pictures,
    chapters: [],
    ...(lyrics === undefined ? {} : { lyrics }),
  };
};
