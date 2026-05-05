import { readFile } from "node:fs/promises";
import type { IpcResult, ReadBytesOk, ReadBytesRequest } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Channel handler for `mme:file:readBytes`.
 *
 * Reads raw bytes from an arbitrary path. Mirror of {@link onWriteBytes}: it
 * exists so Renderer can ingest Pictures / Lyrics auxiliary files (LRC) that
 * do not flow through the dedicated `mme:track:load` channel.
 *
 * The returned `bytes` is a `Uint8Array` view detached from the underlying
 * `Buffer` so structured-clone IPC ships a clean owned buffer to Renderer.
 *
 * @param _ev - Electron event object (unused).
 * @param request - Source file path.
 * @returns The file path and bytes or a serialisable error.
 */
export const onReadBytes = async (
  _ev: Electron.IpcMainInvokeEvent,
  request: ReadBytesRequest,
): Promise<IpcResult<ReadBytesOk>> => {
  try {
    const buffer = await readFile(request.filePath);
    const bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).slice();
    return { ok: true, value: { filePath: request.filePath, bytes } };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:file:readBytes]", request.filePath, ipcError);
    return { ok: false, error: ipcError };
  }
};
