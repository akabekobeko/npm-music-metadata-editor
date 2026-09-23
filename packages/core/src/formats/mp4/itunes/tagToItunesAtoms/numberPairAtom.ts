import { hasTagValue } from "../../../../utils/tagPatch/hasTagValue.js";
import type { ItunesAtom } from "../../types.js";
import { numberAndTotalValue } from "./numberAndTotalValue.js";
import { singleValueAtom } from "./singleValueAtom.js";
import { tombstoneAtom } from "./tombstoneAtom.js";

/** Arguments for {@link numberPairAtom}. */
type Args = {
  /** Atom code (`trkn` / `disk`). */
  name: string;
  /** Track / disc number from the patch. */
  number: number | null | undefined;
  /** Track / disc total from the patch. */
  total: number | null | undefined;
  /** Whether to append the 2-byte trailing pad iTunes includes for `trkn` only. */
  trailingPad: boolean;
};

/**
 * Build the `trkn` / `disk` atom for a (number, total) pair from a patch.
 *
 * - Both `undefined` → nothing to write (`undefined`).
 * - Every provided value cleared (`null`) → a tombstone that removes the atom.
 * - Otherwise → the atom, with `undefined` / cleared halves written as `0`.
 *
 * @returns The atom to merge, or `undefined` when the pair was not touched.
 */
export const numberPairAtom = ({
  name,
  number,
  total,
  trailingPad,
}: Args): ItunesAtom | undefined => {
  const provided = [number, total].filter((value) => value !== undefined);
  if (provided.length === 0) {
    return undefined;
  }

  if (!provided.some((value) => hasTagValue(value))) {
    return tombstoneAtom({ name });
  }

  return singleValueAtom(
    name,
    numberAndTotalValue({
      number: hasTagValue(number) ? number : 0,
      total: hasTagValue(total) ? total : 0,
      trailingPad,
    }),
  );
};
