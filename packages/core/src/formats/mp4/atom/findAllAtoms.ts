import type { Atom } from "./types.js";

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
