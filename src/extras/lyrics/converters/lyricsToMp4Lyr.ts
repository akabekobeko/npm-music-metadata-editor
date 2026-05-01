import { Buffer } from "node:buffer";
import { ItunesDataType } from "../../../formats/mp4/constants.js";
import type { ItunesAtom } from "../../../formats/mp4/types.js";
import type { LyricsInfo } from "../../../types.js";
import { formatLrc } from "../formatLrc.js";

/**
 * Encode a {@link LyricsInfo} as an MP4 `©lyr` atom.
 *
 * Synchronized lyrics are serialized via {@link formatLrc} so timestamps
 * survive the round-trip; lyrics carrying only an `unsynchronized` payload
 * pass through verbatim. The text is encoded as UTF-8 (`ItunesDataType.Utf8`)
 * matching the iTunes convention for `©lyr`.
 *
 * @param lyrics - Source lyrics.
 * @returns The atom ready to merge into the ilst list, or `undefined` when
 *   the lyrics record holds no encodable text.
 */
export const lyricsToMp4Lyr = (lyrics: LyricsInfo): ItunesAtom | undefined => {
  const text =
    lyrics.synchronized !== undefined && lyrics.synchronized.length > 0
      ? formatLrc(lyrics)
      : lyrics.unsynchronized;
  if (text === undefined || text === "") {
    return undefined;
  }

  const buf = Buffer.from(text, "utf8");
  return {
    name: "©lyr",
    values: [
      {
        typeIndicator: ItunesDataType.Utf8,
        locale: 0,
        data: new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength),
      },
    ],
  };
};
