import { ID3V1_NO_GENRE } from "../../../tags/id3v1/constants.js";
import type { Id3v1Tag } from "../../../tags/id3v1/types.js";
import type { TagData } from "../../../types.js";

/**
 * Project a {@link TagData} value onto an {@link Id3v1Tag} for the trailer.
 *
 * @param tag - High-level tag fields. Missing values become empty strings or `undefined`.
 * @returns An `Id3v1Tag` whose minor version is `1` when `tag.trackNumber` is set, else `0`.
 */
export const buildId3v1FromTag = (tag: Partial<TagData>): Id3v1Tag => ({
  minorVersion: tag.trackNumber === undefined ? 0 : 1,
  title: tag.title ?? "",
  artist: tag.artist ?? "",
  album: tag.album ?? "",
  year: tag.year === undefined ? "" : String(tag.year).padStart(4, "0").slice(0, 4),
  comment: tag.comment ?? "",
  ...(tag.trackNumber !== undefined ? { trackNumber: tag.trackNumber } : {}),
  ...(tag.genre !== undefined ? { genre: tag.genre } : {}),
  genreCode: ID3V1_NO_GENRE,
});
