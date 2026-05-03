import { buildCommentFrameBody } from "../../../tags/id3v2/buildId3v2/buildCommentFrameBody/buildCommentFrameBody.js";
import type { LyricsInfo } from "../../../types.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";

/** Arguments for {@link lyricsToUslt}. */
type Args = {
  /** Source lyrics (`unsynchronized` is required). */
  lyrics: LyricsInfo;
  /** Encoding to use for the body (defaults to UTF-8 for v2.4 fidelity). */
  encoding?: TextEncoding;
};

/**
 * Encode a {@link LyricsInfo} as an ID3v2 `USLT` frame body.
 *
 * The body follows the same layout as `COMM`:
 * `<encoding:1><language:3><description:term><text>`. The lyrics' language
 * defaults to `"eng"` per the ID3v2 spec when the caller did not provide one.
 *
 * @returns The encoded `USLT` body, or `undefined` when the lyrics carry no
 *   plain-text payload (synchronized-only lyrics belong in `SYLT`).
 */
export const lyricsToUslt = ({ lyrics, encoding = "utf8" }: Args): Uint8Array | undefined => {
  if (lyrics.unsynchronized === undefined || lyrics.unsynchronized === "") {
    return undefined;
  }

  return buildCommentFrameBody({
    language: lyrics.language ?? "eng",
    description: lyrics.description ?? "",
    text: lyrics.unsynchronized,
    encoding,
  });
};
