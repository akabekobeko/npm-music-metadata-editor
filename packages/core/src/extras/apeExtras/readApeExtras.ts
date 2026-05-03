import { ApeItemKind } from "../../tags/ape/constants.js";
import type { ApeTag } from "../../tags/ape/types.js";
import type { PictureInfo } from "../../types.js";
import { apeBinaryItemToPicture } from "../picture/converters/apeBinaryItemToPicture.js";

/** Extras surfaced from an APE Tag. */
export type ApeExtras = {
  /** Decoded `Cover Art (...)` binary items in tag order. */
  pictures: readonly PictureInfo[];
};

/**
 * Project an {@link ApeTag} onto the extras surface (pictures only — APE has
 * no first-class lyrics or chapter encoding).
 *
 * Iterates the tag's items once, dispatching every binary item whose key
 * starts with `"Cover Art"` through {@link apeBinaryItemToPicture}.
 *
 * @param tag - Source APE Tag.
 * @returns The decoded extras.
 */
export const readApeExtras = (tag: ApeTag): ApeExtras => {
  const pictures: PictureInfo[] = [];
  for (const item of tag.items) {
    if (item.kind !== ApeItemKind.Binary) {
      continue;
    }

    if (!item.key.toUpperCase().startsWith("COVER ART")) {
      continue;
    }

    const picture = apeBinaryItemToPicture(item);
    if (picture !== undefined) {
      pictures.push(picture);
    }
  }

  return { pictures };
};
