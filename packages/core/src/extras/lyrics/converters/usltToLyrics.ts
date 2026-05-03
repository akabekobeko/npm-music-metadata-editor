import { parseCommentFrame } from "../../../tags/id3v2/parseId3v2/parseCommentFrame/parseCommentFrame.js";
import type { LyricsInfo } from "../../../types.js";

/**
 * Decode an ID3v2 `USLT` (unsynchronised lyrics / text transcription) frame
 * body into a {@link LyricsInfo}.
 *
 * `USLT` shares its layout with `COMM` (`<encoding:1><language:3><description:term><text>`),
 * so we route through {@link parseCommentFrame} and reinterpret the resulting
 * fields as lyric metadata.
 *
 * @param body - Frame body bytes (after unsync / data-length unwrap).
 * @returns The decoded lyrics, or `undefined` when the body is malformed.
 */
export const usltToLyrics = (body: Uint8Array): LyricsInfo | undefined => {
  const frame = parseCommentFrame(body);
  if (frame === undefined) {
    return undefined;
  }

  const lyrics: LyricsInfo = {};
  if (frame.language !== "") {
    lyrics.language = frame.language;
  }

  if (frame.description !== "") {
    lyrics.description = frame.description;
  }

  if (frame.text !== "") {
    lyrics.unsynchronized = frame.text;
  }

  return lyrics;
};
