/** Arguments for {@link buildOffsetRemap}. */
type Args = {
  /** Original byte offset of the atom whose size changes. */
  changedAtomOffset: number;
  /** Original byte size of that atom. */
  changedAtomOldSize: number;
  /** New byte size of that atom (`new - old` is the delta). */
  changedAtomNewSize: number;
};

/**
 * Build the `(oldOffset) → newOffset` function used when one atom in the file
 * changes size.
 *
 * Any chunk offset that pointed at or past the end of the resized atom shifts
 * by `new - old`; chunk offsets pointing into earlier regions are unchanged.
 * Pair with `rewriteChunkOffsetAtom` (sibling file) to apply the remap to a
 * concrete `stco` / `co64` atom.
 *
 * @returns A pure function that maps original offsets to post-rewrite ones.
 */
export const buildOffsetRemap = ({
  changedAtomOffset,
  changedAtomOldSize,
  changedAtomNewSize,
}: Args): ((oldOffset: number) => number) => {
  const delta = changedAtomNewSize - changedAtomOldSize;
  const oldEnd = changedAtomOffset + changedAtomOldSize;
  return (oldOffset: number): number => (oldOffset >= oldEnd ? oldOffset + delta : oldOffset);
};
