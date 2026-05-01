import { findAllAtoms } from "../atom/findAllAtoms.js";
import { parseAtomTree } from "../atom/parseAtomTree/parseAtomTree.js";
import type { Atom } from "../atom/types.js";
import { atomsToTagFields } from "../itunes/atomsToTagFields/atomsToTagFields.js";
import { readIlst } from "../itunes/readIlst/readIlst.js";
import type { ItunesAtom, ParsedMp4 } from "../types.js";
import { locateIlst } from "./locateIlst.js";

/**
 * Parse an MP4 file's atom tree and metadata region.
 *
 * @param source - Whole-file bytes.
 * @returns The parsed tree plus extracted iTunes metadata.
 */
export const parseMp4 = (source: Uint8Array): ParsedMp4 => {
  const tree = parseAtomTree(source);
  const moov = tree.find((atom) => atom.type === "moov");
  const ilst = locateIlst(tree);

  const ilstAtoms: readonly ItunesAtom[] = ilst === undefined ? [] : readIlst({ source, ilst });
  const { tag, pictures } = atomsToTagFields(ilstAtoms);

  const chunkOffsetAtoms: readonly Atom[] = [
    ...findAllAtoms(tree, "stco"),
    ...findAllAtoms(tree, "co64"),
  ];

  return {
    tree,
    moov,
    chunkOffsetAtoms,
    metadata: {
      tag,
      pictures,
      ilstAtoms,
      ...(ilst === undefined ? {} : { ilst }),
    },
  };
};
