import { ID3V1_GENRES, ID3V1_NO_GENRE } from "../constants.js";
import type { Id3v1Tag } from "../types.js";

/**
 * Resolve the genre byte to write.
 *
 * Prefers `tag.genreCode` when it is a valid `[0, 255]` integer; otherwise looks
 * up `tag.genre` in {@link ID3V1_GENRES} (case-insensitive). Falls back to
 * {@link ID3V1_NO_GENRE} when nothing resolves.
 */
export const resolveGenreByte = (tag: Id3v1Tag): number => {
  if (Number.isInteger(tag.genreCode) && tag.genreCode >= 0 && tag.genreCode <= 0xff) {
    return tag.genreCode;
  }

  if (tag.genre !== undefined) {
    const lowered = tag.genre.toLowerCase();
    const idx = ID3V1_GENRES.findIndex((name) => name.toLowerCase() === lowered);
    if (idx >= 0) {
      return idx;
    }
  }

  return ID3V1_NO_GENRE;
};
