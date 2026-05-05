import { loadTrack } from "@akabeko/music-metadata-editor";
import type { IpcRequestOf, IpcResponseOf } from "../../../shared/ipc-contract.js";
import { toIpcError } from "../errors/toIpcError.js";

/**
 * Channel handler for `mme:track:load`.
 *
 * Thin wrapper that defers all parsing to core's `loadTrack`. Errors are
 * normalised with {@link toIpcError} so that the Renderer always receives a
 * structured-clone-safe payload, and `MmeError` instances are mirrored to
 * `console.error` so the caller can correlate failures from the terminal
 * without opening Devtools.
 *
 * @param request - File path to load.
 * @returns The loaded track, or a serialisable error.
 */
export const handleLoadTrack = async (
  request: IpcRequestOf<"mme:track:load">,
): Promise<IpcResponseOf<"mme:track:load">> => {
  try {
    const track = await loadTrack(request.filePath);
    return { ok: true, value: { filePath: request.filePath, track } };
  } catch (error) {
    const ipcError = toIpcError(error);
    console.error("[mme:track:load]", request.filePath, ipcError);
    return { ok: false, error: ipcError };
  }
};
