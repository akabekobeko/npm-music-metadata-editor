import type { Atom } from "../atom/types.js";
import type { ItunesAtom, ItunesDataValue } from "../types.js";
import { parseDataAtom } from "./parseDataAtom.js";
import { decodeFreeformText } from "./parseFreeformAtom.js";

/** Arguments for {@link readIlst}. */
type Args = {
  /** Whole-file bytes (referenced by atom offsets). */
  source: Uint8Array;
  /** The parsed `ilst` atom. */
  ilst: Atom;
};

/**
 * Pull the `data` (and, for `----`, `mean`/`name`) sub-atoms out of one ilst
 * child and surface them as an {@link ItunesAtom}.
 *
 * @param source - Whole-file bytes.
 * @param child - One child of `ilst` (e.g. `©nam`, `trkn`, `----`).
 * @returns An {@link ItunesAtom} representation of the entry.
 */
const readIlstEntry = (source: Uint8Array, child: Atom): ItunesAtom => {
  const childAtoms = child.children ?? [];
  const meanAtom = childAtoms.find((c) => c.type === "mean");
  const nameAtom = childAtoms.find((c) => c.type === "name");
  const dataAtoms = childAtoms.filter((c) => c.type === "data");
  const values: ItunesDataValue[] = dataAtoms.map((atom) => parseDataAtom(source, atom));
  return {
    name: child.type,
    ...(meanAtom === undefined ? {} : { meanNamespace: decodeFreeformText(source, meanAtom) }),
    ...(nameAtom === undefined ? {} : { meanName: decodeFreeformText(source, nameAtom) }),
    values,
  };
};

/**
 * Decode every direct child of an `ilst` atom into the structured
 * {@link ItunesAtom} list. Order is preserved so the writer can round-trip
 * unknown entries in their original position.
 *
 * @returns The decoded ilst entries in file order.
 */
export const readIlst = ({ source, ilst }: Args): readonly ItunesAtom[] =>
  (ilst.children ?? []).map((child) => readIlstEntry(source, child));
