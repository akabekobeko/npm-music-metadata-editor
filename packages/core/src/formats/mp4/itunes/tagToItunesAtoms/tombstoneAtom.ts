import type { ItunesAtom } from "../../types.js";

/** Arguments for {@link tombstoneAtom}. */
type Args = {
  /** 4-character atom code (`©nam`, `tmpo`, `----`, ...). */
  name: string;
  /** `name` field-name string when the atom is a `----` freeform. */
  meanName?: string;
};

/**
 * Build a deletion marker for an ilst atom.
 *
 * A tombstone is an {@link ItunesAtom} with no `values`. `mergeIlstAtoms`
 * treats it as "evict the existing atom with this key" and never emits the
 * tombstone itself, so the field ends up absent from the rewritten file.
 *
 * @returns An atom record carrying an empty `values` list.
 */
export const tombstoneAtom = ({ name, meanName }: Args): ItunesAtom => ({
  name,
  ...(meanName === undefined ? {} : { meanName }),
  values: [],
});
