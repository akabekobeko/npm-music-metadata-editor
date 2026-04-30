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

/**
 * Return every atom of the given type reachable from `roots` (depth-first).
 *
 * Used by the writer to update *all* `stco` / `co64` boxes, which are
 * scattered across one entry per `trak`.
 *
 * @param roots - Atoms to walk.
 * @param type - 4-character type code to search for.
 * @returns Matching atoms in pre-order traversal order.
 */
export const findAllAtoms = (roots: readonly Atom[], type: string): readonly Atom[] => {
  const out: Atom[] = [];
  const visit = (atoms: readonly Atom[]): void => {
    for (const atom of atoms) {
      if (atom.type === type) {
        out.push(atom);
      }

      if (atom.children !== undefined) {
        visit(atom.children);
      }
    }
  };

  visit(roots);
  return out;
};
