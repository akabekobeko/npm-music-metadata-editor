import { writeFile } from "node:fs/promises";
import { writeMetadata } from "@akabeko/music-metadata-editor";
import { IpcKeys } from "./ipcKeys.js";
import type { IpcResult, ProgressSavePayload, SaveTrackOk, SaveTrackRequest } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Channel handler for `mme:track:save`.
 *
 * Rebuilds the file via core's `writeMetadata` (auto-detects the format from
 * the source path) and overwrites the original file in place. Phase 6 keeps
 * the contract narrow:
 *
 * - One file per call. Batch saves are driven by Renderer's `saveDirtyRows`,
 *   which iterates serially.
 * - Pictures / chapters / lyrics are forwarded as-is when present; omitting
 *   them preserves the on-disk values (see `WriteOptions` in core).
 * - `warnings` is currently always empty; the caller surfaces the warnings
 *   that come back through the post-save `loadMany`.
 *
 * The handler also fires `mme:progress:save` (1-way) twice — once just before
 * the rebuild and once after success — so Renderer can power the modal
 * progress bar without polling.
 *
 * @param ev - Electron event carrying the originating `WebContents`.
 * @param request - File path + tag patch + optional pictures / chapters / lyrics.
 * @returns The persisted path and an empty warnings list, or a serialisable
 *   error.
 */
export const onSaveTrack = async (
  ev: Electron.IpcMainInvokeEvent,
  request: SaveTrackRequest,
): Promise<IpcResult<SaveTrackOk>> => {
  emitProgress(ev, { filePath: request.filePath, phase: "writing" });

  try {
    const bytes = await writeMetadata(request.filePath, {
      tag: request.tag,
      ...(request.pictures !== undefined ? { pictures: request.pictures } : {}),
      ...(request.chapters !== undefined ? { chapters: request.chapters } : {}),
      ...(request.lyrics !== undefined ? { lyrics: request.lyrics } : {}),
    });
    await writeFile(request.filePath, Buffer.from(bytes));
    emitProgress(ev, { filePath: request.filePath, phase: "done" });
    return { ok: true, value: { filePath: request.filePath, warnings: [] } };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:track:save]", request.filePath, ipcError);
    return { ok: false, error: ipcError };
  }
};

/**
 * Best-effort progress emission. Swallows send failures (the WebContents may
 * have been destroyed during a window-close race); the IPC response is the
 * authoritative success / failure signal anyway.
 *
 * @param ev - Electron event carrying the originating `WebContents`.
 * @param payload - Progress event to deliver.
 */
const emitProgress = (ev: Electron.IpcMainInvokeEvent, payload: ProgressSavePayload): void => {
  if (ev.sender.isDestroyed?.()) {
    return;
  }

  ev.sender.send(IpcKeys.ProgressSave, payload);
};
