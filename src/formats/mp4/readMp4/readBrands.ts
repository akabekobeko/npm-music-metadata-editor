import { Buffer } from "node:buffer";
import type { Atom } from "../atom/types.js";

/**
 * Read the brand list at the start of the file's `ftyp` atom.
 *
 * @param source - Whole-file bytes.
 * @param tree - Top-level atoms.
 * @returns The major brand + compatible brands found in `ftyp`, or an empty
 *   list when the atom is missing or malformed.
 */
export const readBrands = (source: Uint8Array, tree: readonly Atom[]): readonly string[] => {
  const ftyp = tree.find((atom) => atom.type === "ftyp");
  if (ftyp === undefined || ftyp.payloadSize < 8) {
    return [];
  }

  const view = Buffer.from(source.buffer, source.byteOffset + ftyp.payloadOffset, ftyp.payloadSize);
  // major_brand (4) + minor_version (4) + N * compatible_brands (4)
  const major = view.toString("latin1", 0, 4);
  const compatible: string[] = [];
  for (let pos = 8; pos + 4 <= view.length; pos += 4) {
    compatible.push(view.toString("latin1", pos, pos + 4));
  }

  return [major, ...compatible];
};
