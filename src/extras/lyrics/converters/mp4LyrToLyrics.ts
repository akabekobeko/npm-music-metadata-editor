import { Buffer } from "node:buffer";
import type { ItunesAtom } from "../../../formats/mp4/types.js";
import type { LyricsInfo } from "../../../types.js";
import { parseLrc } from "../parseLrc.js";

/**
 * Decode an MP4 `©lyr` atom into a {@link LyricsInfo}.
 *
 * `©lyr` carries lyrics as a UTF-8 text payload. When the text contains LRC
 * timestamps we route through {@link parseLrc} so synchronized lyrics surface
 * as `synchronized`; otherwise the text lands on `unsynchronized` verbatim.
 *
 * @param atom - The decoded `©lyr` atom from `ilst`.
 * @returns The decoded lyrics, or `undefined` when the atom carried no text.
 */
export const mp4LyrToLyrics = (atom: ItunesAtom): LyricsInfo | undefined => {
  const first = atom.values[0];
  if (first === undefined || first.data.length === 0) {
    return undefined;
  }

  const text = Buffer.from(
    first.data.buffer,
    first.data.byteOffset,
    first.data.byteLength,
  ).toString("utf8");
  if (text === "") {
    return undefined;
  }

  return parseLrc(text);
};
