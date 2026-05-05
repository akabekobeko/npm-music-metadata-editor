import { BrowserWindow, dialog, type SaveDialogOptions } from "electron";
import type { IpcResult, ShowSaveFileOk, ShowSaveFileRequest } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Channel handler for `mme:dialog:saveFile`.
 *
 * Shows the system save-file dialog and returns the chosen absolute path. The
 * file is intentionally **not** written by this handler: companion channels
 * such as `mme:file:writeBytes` perform the actual write so the contract stays
 * focused on a single concern.
 *
 * Cancellation is reported as `{ ok: true, value: null }` rather than a
 * failure so Renderer code can branch on `null` without parsing error
 * payloads.
 *
 * @param ev - Electron event object; `ev.sender` identifies the parent window.
 * @param request - Optional payload; carries the default file name and
 *   dialog filters.
 * @returns The chosen path or `null` when cancelled.
 */
export const onShowSaveFile = async (
  ev: Electron.IpcMainInvokeEvent,
  request?: ShowSaveFileRequest,
): Promise<IpcResult<ShowSaveFileOk>> => {
  try {
    const options: SaveDialogOptions = {};
    if (request?.defaultFileName !== undefined) {
      options.defaultPath = request.defaultFileName;
    }

    if (request?.filters !== undefined) {
      options.filters = request.filters.map((filter) => ({
        name: filter.name,
        extensions: [...filter.extensions],
      }));
    }

    const parent = BrowserWindow.fromWebContents(ev.sender);
    const result = await (parent === null
      ? dialog.showSaveDialog(options)
      : dialog.showSaveDialog(parent, options));

    if (result.canceled || result.filePath === undefined || result.filePath === "") {
      return { ok: true, value: null };
    }

    return { ok: true, value: { filePath: result.filePath } };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:dialog:saveFile]", ipcError);
    return { ok: false, error: ipcError };
  }
};
