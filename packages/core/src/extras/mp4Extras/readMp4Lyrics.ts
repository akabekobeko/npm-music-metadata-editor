import type { ItunesAtom } from "../../formats/mp4/types.js";
import type { LyricsInfo } from "../../types.js";
import { mp4LyrToLyrics } from "../lyrics/converters/mp4LyrToLyrics.js";

/**
 * Locate the `©lyr` atom inside the parsed ilst list and project it onto
 * a {@link LyricsInfo}.
 *
 * Only the first `©lyr` is consulted (the iTunes convention emits at most one).
 *
 * @param atoms - Parsed ilst atoms in tag order.
 * @returns The decoded lyrics, or `undefined` when no `©lyr` was present.
 */
export const readMp4Lyrics = (atoms: readonly ItunesAtom[]): LyricsInfo | undefined => {
  const atom = atoms.find((entry) => entry.name === "©lyr");
  if (atom === undefined) {
    return undefined;
  }

  return mp4LyrToLyrics(atom);
};
