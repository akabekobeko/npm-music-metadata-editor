import { expandDroppedPaths } from "../dnd/expandDroppedPaths.js";
import type { ExpandPathsOk, ExpandPathsRequest, IpcResult } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Channel handler for `mme:dialog:expandPaths`.
 *
 * Called from the Renderer when the user drops a mix of files and folders
 * onto the window. Folders are walked up to the dnd module's depth cap and
 * filtered by extension; symlinks are skipped (see `expandDroppedPaths`).
 *
 * The shape mirrors the dialog handlers (`{ ok, value }` envelope, errors
 * normalised to {@link IpcError}) so the Renderer can reuse its existing
 * `IpcResult` branch logic.
 *
 * @param _ev - Electron event object (unused).
 * @param request - Paths to expand.
 * @returns Resolved audio file paths under the {@link IpcResult} envelope.
 */
export const onExpandPaths = async (
  _ev: Electron.IpcMainInvokeEvent,
  request: ExpandPathsRequest,
): Promise<IpcResult<ExpandPathsOk>> => {
  try {
    const filePaths = await expandDroppedPaths({ paths: request.paths });
    return { ok: true, value: { filePaths } };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:dialog:expandPaths]", ipcError);
    return { ok: false, error: ipcError };
  }
};
