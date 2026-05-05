import { buildFormatSupportMatrix } from "./formatSupport/buildFormatSupportMatrix.js";
import type { FormatSupportEntry, IpcResult } from "./types.js";
import { toIpcError } from "./utils/toIpcError.js";

/**
 * Channel handler for `mme:formatSupport:list`.
 *
 * Returns the static capability table built by {@link buildFormatSupportMatrix}.
 * The handler stays async to match the IPC bridge signature even though the
 * underlying matrix is computed synchronously; this keeps Renderer call sites
 * uniform.
 *
 * @param _ev - Electron event object (unused).
 * @returns The format-support matrix wrapped in an `IpcResult`.
 */
export const onListFormatSupport = async (
  _ev: Electron.IpcMainInvokeEvent,
): Promise<IpcResult<readonly FormatSupportEntry[]>> => {
  try {
    return { ok: true, value: buildFormatSupportMatrix() };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:formatSupport:list]", ipcError);
    return { ok: false, error: ipcError };
  }
};
