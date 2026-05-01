import type { Atom } from "../../atom/types.js";
import type { ItunesAtom } from "../../types.js";
import { readIlstEntry } from "./readIlstEntry.js";

/** Arguments for {@link readIlst}. */
type Args = {
  /** Whole-file bytes (referenced by atom offsets). */
  source: Uint8Array;
  /** The parsed `ilst` atom. */
  ilst: Atom;
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
