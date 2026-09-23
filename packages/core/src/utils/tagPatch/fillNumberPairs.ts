import type { TagData, TagPatch } from "../../types.js";

/** Arguments for {@link fillNumberPairs}. */
type Args = {
  /** Caller-supplied fields to merge in. */
  patch: TagPatch;
  /** Tag fields currently stored in the file. */
  existing: TagData;
};

/** `(number, total)` field pairs that some formats store in a single entry. */
const PAIRS: ReadonlyArray<[keyof TagData, keyof TagData]> = [
  ["trackNumber", "trackTotal"],
  ["discNumber", "discTotal"],
];

/**
 * Complete half-specified `(number, total)` pairs from the existing tag.
 *
 * Several formats keep a track / disc number and its total inside one
 * physical entry (`TRACKNUMBER=2/10`, the MP4 `trkn` atom, ...). A writer
 * that only knows the caller's patch cannot rewrite one half while keeping
 * the other, so when exactly one half of a pair is touched (set or cleared)
 * the untouched half is copied from `existing`. Pairs that are fully
 * specified or fully untouched pass through unchanged.
 *
 * @returns A fresh {@link TagPatch} (neither input is mutated).
 */
export const fillNumberPairs = ({ patch, existing }: Args): TagPatch => {
  const out: TagPatch = { ...patch };
  for (const [numberField, totalField] of PAIRS) {
    const numberTouched = patch[numberField] !== undefined;
    const totalTouched = patch[totalField] !== undefined;
    if (numberTouched === totalTouched) {
      continue;
    }

    const untouched = numberTouched ? totalField : numberField;
    const stored = existing[untouched];
    if (stored !== undefined) {
      (out as Record<string, string | number | null | undefined>)[untouched] = stored;
    }
  }

  return out;
};
