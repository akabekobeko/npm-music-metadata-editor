import type { IpcResponseOf } from "../../../shared/ipc-contract.js";
import { toIpcError } from "../errors/toIpcError.js";
import { buildFormatSupportMatrix } from "./matrix.js";

/**
 * Channel handler for `mme:formatSupport:list`.
 *
 * Returns the static capability table built by {@link buildFormatSupportMatrix}.
 * The handler stays async to match the {@link IpcContract} signature even
 * though the underlying matrix is computed synchronously; this keeps Renderer
 * call sites uniform.
 *
 * @returns The format-support matrix wrapped in an `IpcResult`.
 */
export const handleFormatSupportList = async (): Promise<
  IpcResponseOf<"mme:formatSupport:list">
> => {
  try {
    return { ok: true, value: buildFormatSupportMatrix() };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:formatSupport:list]", ipcError);
    return { ok: false, error: ipcError };
  }
};
