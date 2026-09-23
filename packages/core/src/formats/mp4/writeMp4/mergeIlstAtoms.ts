import type { ItunesAtom } from "../types.js";

/**
 * Merge the existing ilst atoms with newly-projected ones from the tag.
 *
 * Strategy: replace any atom whose 4-character type is owned by the new tag
 * (matching by exact type — e.g. `©nam`, `trkn`, `covr`); leave everything
 * else (including unrecognised codes and freeform `----` entries we did not
 * handle) untouched. Newly-projected atoms that did not previously exist are
 * appended at the end.
 *
 * Incoming atoms with no `values` are *tombstones*: they evict the existing
 * atom with the same key exactly like a replacement would, but are dropped
 * from the result instead of being emitted, so the field disappears from
 * the rewritten file.
 *
 * @param existing - Atoms parsed from the source file's ilst.
 * @param incoming - Atoms produced from the new tag (may include tombstones).
 * @returns The merged atom list in writing order.
 */
export const mergeIlstAtoms = (
  existing: readonly ItunesAtom[],
  incoming: readonly ItunesAtom[],
): readonly ItunesAtom[] => {
  const replaceableTypes = new Set(incoming.filter((a) => a.name !== "----").map((a) => a.name));
  // Replaceable freeform entries are matched by `(meanNamespace, meanName)`.
  const replaceableFreeform = new Set(
    incoming.filter((a) => a.name === "----").map((a) => freeformKey(a)),
  );

  const carriedOver = existing.filter((atom) => {
    if (atom.name === "----") {
      return !replaceableFreeform.has(freeformKey(atom));
    }

    return !replaceableTypes.has(atom.name);
  });

  return [...carriedOver, ...incoming.filter((atom) => atom.values.length > 0)];
};

/**
 * Build the lookup key of a `----` freeform atom.
 *
 * @param atom - Freeform atom.
 * @returns `"<namespace>::<name>"`, with missing parts left empty.
 */
const freeformKey = (atom: ItunesAtom): string =>
  `${atom.meanNamespace ?? ""}::${atom.meanName ?? ""}`;
