import type { Id3v1Tag } from "../../../tags/id3v1/types.js";
import type { TagPatch } from "../../../types.js";
import { hasTagValue } from "../../../utils/tagPatch/hasTagValue.js";

/**
 * Project a {@link TagPatch} value onto an {@link Id3v1Tag} for the trailer.
 *
 * @param tag - High-level tag fields. Missing / cleared values become empty strings or `undefined`.
 * @returns An `Id3v1Tag` whose minor version is `1` when `tag.trackNumber` is set, else `0`.
 */
export const buildId3v1FromTag = (tag: TagPatch): Id3v1Tag => ({
  minorVersion: hasTagValue(tag.trackNumber) ? 1 : 0,
  title: tag.title ?? "",
  artist: tag.artist ?? "",
  album: tag.album ?? "",
  year: hasTagValue(tag.year) ? String(tag.year).padStart(4, "0").slice(0, 4) : "",
  comment: tag.comment ?? "",
  ...(hasTagValue(tag.trackNumber) ? { trackNumber: tag.trackNumber } : {}),
  // No genreCode here: the writer resolves the byte from the genre name.
  ...(hasTagValue(tag.genre) ? { genre: tag.genre } : {}),
});
