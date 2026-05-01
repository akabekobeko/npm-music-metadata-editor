import type { VorbisComment } from "../../../tags/vorbisComment/types.js";
import type { LyricsInfo } from "../../../types.js";
import { parseLrc } from "../parseLrc.js";

/** Vorbis Comment keys that carry lyrics text. The first match wins. */
const LYRICS_KEYS: readonly string[] = ["LYRICS", "UNSYNCEDLYRICS", "UNSYNCED LYRICS"];

/**
 * Project a Vorbis Comment block onto a {@link LyricsInfo}.
 *
 * Vorbis Comment has no dedicated lyrics frame; instead the convention is to
 * place the entire LRC document under a `LYRICS` (or, less often,
 * `UNSYNCEDLYRICS`) entry. We pick the first match, run it through
 * {@link parseLrc} so timestamped LRC content surfaces as `synchronized`, and
 * fall back to the raw text on `unsynchronized` when no timestamps exist.
 *
 * @param comment - Source Vorbis Comment block.
 * @returns The decoded lyrics, or `undefined` when the block carried no
 *   recognised lyrics entry.
 */
export const vorbisCommentToLyrics = (comment: VorbisComment): LyricsInfo | undefined => {
  const matchedEntry = comment.comments.find((entry) =>
    LYRICS_KEYS.includes(entry.key.toUpperCase()),
  );
  if (matchedEntry === undefined) {
    return undefined;
  }

  return parseLrc(matchedEntry.value);
};
