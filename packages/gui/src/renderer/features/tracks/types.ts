import type { IpcError, Track } from "../../../main/ipc/types.js";

/**
 * One row in the spreadsheet.
 *
 * Identity is the absolute file path: opening the same path twice replaces the
 * earlier row (handled by the reducer). `track` is the latest in-memory state
 * (with edits applied), `origin` is the snapshot returned by core at load time
 * so the reducer can re-derive `dirty` after each commit and so a future
 * "revert" reduces to `track = origin`.
 *
 * `saveError` is set after a failed `mme:track:save` and cleared the next time
 * the row is reloaded successfully. UI surfaces a red marker for any row with
 * a non-`undefined` `saveError`.
 */
export type TrackRow = {
  readonly filePath: string;
  readonly track: Track;
  readonly origin: Track;
  readonly dirty: boolean;
  readonly saveError?: IpcError;
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
