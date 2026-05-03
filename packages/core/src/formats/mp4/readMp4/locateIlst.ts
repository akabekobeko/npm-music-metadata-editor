import { findAtom } from "../atom/findAtom.js";
import type { Atom } from "../atom/types.js";

/**
 * Walk the tree to locate the `ilst` atom inside `moov/udta/meta` (the
 * canonical iTunes location). Returns `undefined` when the file contains no
 * such metadata region.
 *
 * @param tree - Top-level atoms parsed from the file.
 * @returns The `ilst` atom, or `undefined` when not present.
 */
export const locateIlst = (tree: readonly Atom[]): Atom | undefined =>
  findAtom(tree, ["moov", "udta", "meta", "ilst"]);
