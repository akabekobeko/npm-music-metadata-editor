import { writeFile } from "node:fs/promises";
import type { IpcResult, WriteBytesRequest } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Channel handler for `mme:file:writeBytes`.
 *
 * Writes raw bytes to an arbitrary path picked via `mme:dialog:saveFile`.
 * **Not** intended for music files themselves — those go through
 * `mme:track:save`. The channel exists so Renderer can export Pictures /
 * Lyrics auxiliary files (PNG, LRC, ...) without growing a Node dependency.
 *
 * Existing files are overwritten without a second prompt because the save
 * dialog has already collected the user's confirmation.
 *
 * @param _ev - Electron event object (unused).
 * @param request - Destination path and bytes to write.
 * @returns `{ ok: true, value: undefined }` on success or a serialisable
 *   error.
 */
export const onWriteBytes = async (
  _ev: Electron.IpcMainInvokeEvent,
  request: WriteBytesRequest,
): Promise<IpcResult<void>> => {
  try {
    await writeFile(request.filePath, Buffer.from(request.bytes));
    return { ok: true, value: undefined };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:file:writeBytes]", request.filePath, ipcError);
    return { ok: false, error: ipcError };
  }
};
