import type { IpcRequestOf, IpcResponseOf } from "../../../shared/ipc-contract.js";

/**
 * Phase 2 stub for `mme:track:save`.
 *
 * The channel and Bridge are declared here so Renderer code can be type-checked
 * end-to-end before the real save pipeline lands in Phase 6. Until then, every
 * call short-circuits with a `NotImplemented` `IpcError` so consumers fail
 * loudly instead of silently dropping writes.
 *
 * @param _request - Reserved for the Phase 6 implementation.
 * @returns A `NotImplemented` failure.
 */
export const handleSaveTrack = async (
  _request: IpcRequestOf<"mme:track:save">,
): Promise<IpcResponseOf<"mme:track:save">> => ({
  ok: false,
  error: {
    name: "NotImplemented",
    message: "mme:track:save is not implemented yet (Phase 6).",
  },
});
