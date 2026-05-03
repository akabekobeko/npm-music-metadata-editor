import type { VorbisComment } from "../../tags/vorbisComment/types.js";
import type { LyricsInfo } from "../../types.js";
import { vorbisCommentToLyrics } from "../lyrics/converters/vorbisCommentToLyrics.js";

/**
 * Project a Vorbis Comment block onto a {@link LyricsInfo}, returning
 * `undefined` when no recognised lyrics entry was present.
 *
 * Thin wrapper over {@link vorbisCommentToLyrics} kept as a separate file so
 * callers can grep for the FLAC / Ogg lyrics surface independently of the raw
 * converter.
 *
 * @param comment - Source Vorbis Comment block.
 * @returns The decoded lyrics, or `undefined`.
 */
export const readVorbisCommentLyrics = (comment: VorbisComment): LyricsInfo | undefined =>
  vorbisCommentToLyrics(comment);
