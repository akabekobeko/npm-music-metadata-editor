import type { VorbisCommentEntry } from "../../tags/vorbisComment/types.js";
import type { LyricsInfo, PictureInfo } from "../../types.js";
import { lyricsToVorbisComment } from "../lyrics/converters/lyricsToVorbisComment.js";
import { pictureToMetadataBlockPicture } from "../picture/converters/pictureToMetadataBlockPicture.js";

/** Vorbis Comment keys this writer manages when extras are supplied. */
export const MANAGED_EXTRA_KEYS: readonly string[] = [
  "METADATA_BLOCK_PICTURE",
  "LYRICS",
  "UNSYNCEDLYRICS",
  "UNSYNCED LYRICS",
];

/** Arguments for {@link buildVorbisCommentExtras}. */
type Args = {
  /** Pictures to embed (one entry per picture). */
  pictures?: readonly PictureInfo[];
  /** Lyrics to embed under the canonical `LYRICS` key. */
  lyrics?: LyricsInfo;
};

/**
 * Build the Vorbis Comment entries that carry the supplied extras.
 *
 * Each picture lands as a `METADATA_BLOCK_PICTURE` entry; lyrics land as a
 * single `LYRICS` entry encoded via {@link lyricsToVorbisComment} so timestamps
 * survive the round-trip.
 *
 * Callers are responsible for stripping the keys returned by
 * {@link MANAGED_EXTRA_KEYS} from any pre-existing entry list before merging
 * the synthesized entries — otherwise the writer will emit duplicates.
 *
 * @returns The synthesized entries (empty when neither pictures nor lyrics are supplied).
 */
export const buildVorbisCommentExtras = ({ pictures, lyrics }: Args): VorbisCommentEntry[] => {
  const out: VorbisCommentEntry[] = [];
  if (pictures !== undefined) {
    for (const picture of pictures) {
      out.push({
        key: "METADATA_BLOCK_PICTURE",
        value: pictureToMetadataBlockPicture(picture),
      });
    }
  }

  if (lyrics !== undefined) {
    const entry = lyricsToVorbisComment(lyrics);
    if (entry !== undefined) {
      out.push(entry);
    }
  }

  return out;
};
