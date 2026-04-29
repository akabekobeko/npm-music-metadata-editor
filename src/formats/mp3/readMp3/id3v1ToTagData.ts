import type { Id3v1Tag } from "../../../tags/id3v1/types.js";
import type { TagData } from "../../../types.js";

/** Convert {@link Id3v1Tag} into the high-level {@link TagData} shape. */
export const id3v1ToTagData = (id3v1: Id3v1Tag | undefined): TagData => {
  if (id3v1 === undefined) {
    return {};
  }

  const out: TagData = {};
  if (id3v1.title !== "") out.title = id3v1.title;
  if (id3v1.artist !== "") out.artist = id3v1.artist;
  if (id3v1.album !== "") out.album = id3v1.album;
  if (id3v1.comment !== "") out.comment = id3v1.comment;
  if (id3v1.genre !== undefined) out.genre = id3v1.genre;
  if (id3v1.year !== "") {
    const parsed = Number.parseInt(id3v1.year, 10);
    if (Number.isFinite(parsed)) {
      out.year = parsed;
    }
  }

  if (id3v1.trackNumber !== undefined) {
    out.trackNumber = id3v1.trackNumber;
  }

  return out;
};
