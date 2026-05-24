import type { TrackRow } from "./types.js";

/**
 * Merge a newly-loaded batch of rows into an existing snapshot, keyed by
 * absolute file path with last-write-wins semantics.
 *
 * Rows that exist in `existing` but not in `incoming` are preserved; rows
 * that appear in both are replaced by the `incoming` copy. Insertion order
 * follows `existing` first, then any `incoming` rows whose path was not
 * already present.
 *
 * The same projection is used both by the tracks reducer (to produce the
 * next `TracksState.rows`) and by the AppShell loader callbacks (to derive
 * the row set that should be mirrored into the edit reducer), keeping the
 * two stores in lockstep without a render-time mirror effect.
 *
 * @param existing - Rows already in the store.
 * @param incoming - Rows from one IPC `loadMany` round-trip.
 * @returns Merged row list.
 */
export const mergeRowsByPath = (
  existing: readonly TrackRow[],
  incoming: readonly TrackRow[],
): readonly TrackRow[] => {
  const rowsByPath = new Map<string, TrackRow>(existing.map((row) => [row.filePath, row]));
  for (const row of incoming) {
    rowsByPath.set(row.filePath, row);
  }

  return [...rowsByPath.values()];
};
