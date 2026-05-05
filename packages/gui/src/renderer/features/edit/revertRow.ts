import type { TrackRow } from "../tracks/types.js";

/**
 * Reset a row's track to the snapshot taken at load time.
 *
 * The full origin object is reused (not a clone) because `Track` is treated as
 * immutable across the rest of the renderer; sharing the reference is safe and
 * keeps reverts observably equal to "just-loaded" state via `Object.is`.
 *
 * @param row - Row to revert.
 * @returns A new {@link TrackRow} whose `track` matches `origin` and `dirty`
 *   is `false`.
 */
export const revertRow = (row: TrackRow): TrackRow => ({
  ...row,
  track: row.origin,
  dirty: false,
});
