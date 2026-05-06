import type { TrackRow } from "../tracks/types.js";
import type { SaveProgress, SaveResult, SaveSummary } from "./types.js";

type SaveDirtyRowsArgs = {
  /** Dirty rows to persist, in the order they should be saved. */
  readonly rows: readonly TrackRow[];
  /** Called after each phase transition so the dialog can re-render. */
  readonly onProgress: (progress: SaveProgress) => void;
  /** Optional cancel hook — checked between rows, never mid-write. */
  readonly isCancelled?: () => boolean;
};

/**
 * Persist a batch of dirty rows by calling `mme:track:save` once per row.
 *
 * Saves run **strictly in series**: writing two music files in parallel is a
 * recipe for corrupted shared resources (file handles, OS cache lines), so
 * Phase 6 trades latency for safety. The `isCancelled` hook is consulted
 * between rows — once a save is in flight it always runs to completion.
 *
 * The function never throws: per-row failures are collected into the returned
 * summary, and an envelope-level IPC failure is surfaced the same way as a
 * row-level error. Callers re-`loadMany` afterwards to refresh `Track`
 * snapshots and warnings.
 *
 * @param args - Dirty rows, progress callback, and optional cancel hook.
 * @returns The summary with one {@link SaveResult} per row that was attempted.
 */
export const saveDirtyRows = async ({
  rows,
  onProgress,
  isCancelled,
}: SaveDirtyRowsArgs): Promise<SaveSummary> => {
  const results: SaveResult[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    if (isCancelled?.() === true) {
      return { results, cancelled: true };
    }

    const row = rows[index];
    if (row === undefined) {
      continue;
    }

    const current = index + 1;
    onProgress({ current, total: rows.length, filePath: row.filePath, phase: "start" });
    const result = await saveOne(row);
    onProgress({ current, total: rows.length, filePath: row.filePath, phase: "done" });
    results.push(result);
  }

  return { results, cancelled: false };
};

/**
 * Issue a single `mme:track:save` IPC call for one row.
 *
 * `pictures` / `chapters` / `lyrics` are forwarded only when present so the
 * Main handler can apply the `omit-to-preserve` semantics on `WriteOptions`.
 *
 * @param row - Row to persist.
 * @returns A {@link SaveResult} carrying either `error` or no error.
 */
const saveOne = async (row: TrackRow): Promise<SaveResult> => {
  const response = await window.mme.track.save({
    filePath: row.filePath,
    tag: row.track.tag,
    pictures: row.track.pictures,
    chapters: row.track.chapters,
    ...(row.track.lyrics !== undefined ? { lyrics: row.track.lyrics } : {}),
  });
  return response.ok
    ? { filePath: row.filePath }
    : { filePath: row.filePath, error: response.error };
};
