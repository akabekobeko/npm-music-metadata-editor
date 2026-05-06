import type { IpcError, Track } from "@mme/ipc";

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
  /** Absolute path used as the row's identity. */
  readonly filePath: string;
  /** Latest in-memory track with edits applied. */
  readonly track: Track;
  /** Snapshot returned by core at load time; powers `dirty` and revert. */
  readonly origin: Track;
  /** `true` when `track` differs from `origin`. */
  readonly dirty: boolean;
  /** Sticky save failure from the previous Save All run, when any. */
  readonly saveError?: IpcError;
};

/**
 * Per-file load failure surfaced from `mme:track:loadMany`.
 *
 * Carrying the `filePath` alongside the error lets the UI render a row-shaped
 * error placeholder instead of a single global toast.
 */
export type TrackLoadError = {
  /** Absolute path that failed to load. */
  readonly filePath: string;
  /** Serialisable error payload from the IPC envelope. */
  readonly error: IpcError;
};
