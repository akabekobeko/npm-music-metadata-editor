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
 * @param existing - Atoms parsed from the source file's ilst.
 * @param incoming - Atoms produced from the new tag.
 * @returns The merged atom list in writing order.
 */
export const mergeIlstAtoms = (
  existing: readonly ItunesAtom[],
  incoming: readonly ItunesAtom[],
): readonly ItunesAtom[] => {
  const replaceableTypes = new Set(incoming.filter((a) => a.name !== "----").map((a) => a.name));
  // Replaceable freeform entries are matched by `(meanNamespace, meanName)`.
  const replaceableFreeform = new Set(
    incoming
      .filter((a) => a.name === "----")
      .map((a) => `${a.meanNamespace ?? ""}::${a.meanName ?? ""}`),
  );

  const carriedOver = existing.filter((atom) => {
    if (atom.name === "----") {
      const key = `${atom.meanNamespace ?? ""}::${atom.meanName ?? ""}`;
      return !replaceableFreeform.has(key);
    }

    return !replaceableTypes.has(atom.name);
  });

  return [...carriedOver, ...incoming];
};
