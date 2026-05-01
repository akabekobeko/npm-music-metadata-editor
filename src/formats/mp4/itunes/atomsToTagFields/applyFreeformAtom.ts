import type { TagData } from "../../../../types.js";
import type { ItunesAtom } from "../../types.js";
import { readUtf8 } from "./readUtf8.js";

/** Arguments for {@link applyFreeformAtom}. */
type Args = {
  /** Tag accumulator. */
  tag: TagData;
  /** The freeform atom (`----`). */
  atom: ItunesAtom;
};

/**
 * Map a few well-known `----` freeform field names onto our tag shape.
 *
 * Only the names commonly emitted by iTunes / MusicBrainz are handled. The
 * caller still keeps the raw atom in the parsed list so unhandled freeform
 * entries round-trip unchanged.
 */
export const applyFreeformAtom = ({ tag, atom }: Args): void => {
  const first = atom.values[0];
  if (first === undefined) {
    return;
  }

  const text = readUtf8(first);
  switch (atom.meanName) {
    case "LYRICIST":
      tag.lyricist = text;
      return;
    case "CONDUCTOR":
      tag.conductor = text;
      return;
    case "LANGUAGE":
      tag.language = text;
      return;
    case "CATALOGNUMBER":
      tag.productId = text;
      return;
    default:
      return;
  }
};
