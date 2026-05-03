import type { VorbisCommentEntry } from "../../../tags/vorbisComment/types.js";
import type { LyricsInfo } from "../../../types.js";
import { formatLrc } from "../formatLrc.js";

/**
 * Encode a {@link LyricsInfo} as a Vorbis Comment `LYRICS` entry.
 *
 * Synchronized lyrics are serialized via {@link formatLrc} so timestamps
 * survive the round-trip; lyrics carrying only an `unsynchronized` payload
 * pass through verbatim.
 *
 * @param lyrics - Source lyrics.
 * @returns A single Vorbis Comment entry, or `undefined` when the lyrics
 *   record holds no encodable text.
 */
export const lyricsToVorbisComment = (lyrics: LyricsInfo): VorbisCommentEntry | undefined => {
  if (lyrics.synchronized !== undefined && lyrics.synchronized.length > 0) {
    return { key: "LYRICS", value: formatLrc(lyrics) };
  }

  if (lyrics.unsynchronized !== undefined && lyrics.unsynchronized !== "") {
    return { key: "LYRICS", value: lyrics.unsynchronized };
  }

  return undefined;
};
