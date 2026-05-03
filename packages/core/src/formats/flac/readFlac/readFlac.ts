import { readVorbisCommentLyrics } from "../../../extras/vorbisCommentExtras/readVorbisCommentLyrics.js";
import { vorbisCommentToTagData } from "../../../tags/vorbisComment/vorbisCommentToTagData/vorbisCommentToTagData.js";
import type { MetadataReadResult } from "../../../types.js";
import { parseFlac } from "../parseFlac/parseFlac.js";
import { toPictureInfo } from "./toPictureInfo.js";

/**
 * Read FLAC metadata.
 *
 * Parses the metadata region (STREAMINFO + Vorbis Comment + pictures + any
 * pass-through blocks), then projects the Vorbis Comment fields onto our
 * common {@link MetadataReadResult} shape.
 *
 * @param input - Whole-file bytes.
 * @returns A {@link MetadataReadResult} populated with the FLAC tag data.
 */
export const readFlac = async (input: Uint8Array): Promise<MetadataReadResult> => {
  const parsed = parseFlac(input);
  const tag =
    parsed.vorbisComment === undefined ? {} : vorbisCommentToTagData(parsed.vorbisComment);
  const lyrics =
    parsed.vorbisComment === undefined ? undefined : readVorbisCommentLyrics(parsed.vorbisComment);

  return {
    audioFormat: "flac",
    tag,
    pictures: parsed.pictures.map(toPictureInfo),
    chapters: [],
    ...(lyrics === undefined ? {} : { lyrics }),
    ...(parsed.streamInfo.durationMs > 0 ? { durationMs: parsed.streamInfo.durationMs } : {}),
  };
};
