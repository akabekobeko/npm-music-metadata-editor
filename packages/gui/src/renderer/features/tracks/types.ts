import type { IpcError, Track } from "../../../main/ipc/types.js";

/**
 * One row in the spreadsheet.
 *
 * Identity is the absolute file path: opening the same path twice replaces the
 * earlier row (handled by the reducer). `track` is the latest snapshot from
 * core; `dirty` is reserved for Phase 4 and stays `false` while the grid is
 * read-only.
 */
export type TrackRow = {
  readonly filePath: string;
  readonly track: Track;
  readonly dirty: boolean;
};

/**
 * Per-file load failure surfaced from `mme:track:loadMany`.
 *
 * Carrying the `filePath` alongside the error lets the UI render a row-shaped
 * error placeholder instead of a single global toast.
 */
export type TrackLoadError = {
  readonly filePath: string;
  readonly error: IpcError;
};
