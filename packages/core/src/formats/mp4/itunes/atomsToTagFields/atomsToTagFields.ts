import type { PictureInfo, TagData } from "../../../../types.js";
import type { ItunesAtom } from "../../types.js";
import { applyAtomToTag } from "./applyAtomToTag.js";

/**
 * Project the parsed ilst entries onto the public tag shape.
 *
 * @param atoms - All decoded ilst atoms.
 * @returns The projected `tag` plus any decoded `pictures`.
 */
export const atomsToTagFields = (
  atoms: readonly ItunesAtom[],
): { tag: TagData; pictures: readonly PictureInfo[] } => {
  const tag: TagData = {};
  const pictures: PictureInfo[] = [];
  for (const atom of atoms) {
    applyAtomToTag({ tag, pictures, atom });
  }

  return { tag, pictures };
};
