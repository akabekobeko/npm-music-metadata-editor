import type { IpcError } from "../../../main/ipc/types.js";

/**
 * Per-file outcome reported by `saveDirtyRows`.
 *
 * `error` is set only when the IPC call returned `{ ok: false }`; successful
 * saves leave it `undefined` so consumers can distinguish "saved cleanly"
 * from "saved with warnings" (warnings ride along the post-save reload, not
 * here).
 */
export type SaveResult = {
  readonly filePath: string;
  readonly error?: IpcError;
};

/**
 * Aggregate snapshot returned by `saveDirtyRows` after the loop terminates.
 *
 * `cancelled` flips to `true` when the caller's abort signal fired before the
 * loop reached the end. The remaining (untouched) rows still appear in
 * `results` only if they completed before the cancel; rows skipped because
 * of the cancel are absent.
 */
export type SaveSummary = {
  readonly results: readonly SaveResult[];
  readonly cancelled: boolean;
};

/**
 * Progress event delivered to the dialog while `saveDirtyRows` runs.
 *
 * `current` is 1-based for display ("Saving 3 of 5…"); `total` is the size of
 * the dirty batch at the moment the loop started.
 */
export type SaveProgress = {
  readonly current: number;
  readonly total: number;
  readonly filePath: string;
  readonly phase: "start" | "writing" | "done";
};
