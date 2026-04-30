import type { Atom } from "./types.js";

/**
 * Locate the first atom matching `path` walked from `roots`.
 *
 * The path is a sequence of 4-character atom types — for instance
 * `["moov", "udta", "meta", "ilst"]`. Each segment matches the *first* child
 * of the current node with that type; if any segment fails to match the
 * function returns `undefined`.
 *
 * @param roots - Top-level atoms (typically the result of `parseAtomTree`).
 * @param path - Type names to walk in order.
 * @returns The matching atom, or `undefined` when the path cannot be
 *   resolved.
 */
export const findAtom = (roots: readonly Atom[], path: readonly string[]): Atom | undefined => {
  if (path.length === 0) {
    return undefined;
  }

  const [head, ...rest] = path;
  const match = roots.find((atom) => atom.type === head);
  if (match === undefined) {
    return undefined;
  }

  if (rest.length === 0) {
    return match;
  }

  return match.children === undefined ? undefined : findAtom(match.children, rest);
};
