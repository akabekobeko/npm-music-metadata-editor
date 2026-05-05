import { BrowserWindow, dialog, type OpenDialogOptions } from "electron";
import type { IpcResult, ShowOpenFilesRequest } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Audio extensions advertised to the open-file dialog.
 *
 * Mirrors the union of `AudioFormat` extensions accepted by core. When a new
 * format is added to the registry, this list is the place to extend so the
 * dialog stops hiding it.
 */
const AUDIO_EXTENSIONS: readonly string[] = [
  "mp3",
  "flac",
  "m4a",
  "mp4",
  "ogg",
  "opus",
  "wav",
  "aiff",
  "aif",
  "wma",
  "ape",
];

/**
 * Channel handler for `mme:dialog:openFiles`.
 *
 * Resolves the parent window from `event.sender` (matching the reference
 * implementation in `audio-player`) so the modal attaches to the correct
 * BrowserWindow on macOS / Linux. Errors from `dialog.showOpenDialog` are
 * normalised to {@link IpcError} so the Renderer always receives a
 * structured-clone-safe payload.
 *
 * @param ev - Electron event object; `ev.sender` identifies the parent window.
 * @param request - Optional request payload (currently `{ multiple? }`).
 * @returns Selected absolute file paths, or an empty list when the dialog was
 *   cancelled.
 */
export const onShowOpenFiles = async (
  ev: Electron.IpcMainInvokeEvent,
  request?: ShowOpenFilesRequest,
): Promise<IpcResult<readonly string[]>> => {
  try {
    const multiple = request?.multiple ?? true;
    const properties: OpenDialogOptions["properties"] = ["openFile"];
    if (multiple) {
      properties.push("multiSelections");
    }

    const options: OpenDialogOptions = {
      properties,
      filters: [
        { name: "Audio", extensions: [...AUDIO_EXTENSIONS] },
        { name: "All Files", extensions: ["*"] },
      ],
    };

    const parent = BrowserWindow.fromWebContents(ev.sender);
    const result = await (parent === null
      ? dialog.showOpenDialog(options)
      : dialog.showOpenDialog(parent, options));

    if (result.canceled) {
      return { ok: true, value: [] };
    }

    return { ok: true, value: result.filePaths };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:dialog:openFiles]", ipcError);
    return { ok: false, error: ipcError };
  }
};
