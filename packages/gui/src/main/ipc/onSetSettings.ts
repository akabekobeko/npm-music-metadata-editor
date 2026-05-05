import type { IpcResult, SetSettingsRequest, SettingsSnapshot } from "./types.js";

/**
 * Phase 2 stub for `mme:settings:set`.
 *
 * Mirror of `onGetSettings` so Renderer code paths can be exercised before the
 * real persistence layer is wired up.
 *
 * @param _ev - Electron event object (unused).
 * @param _request - Reserved for the Phase 6 implementation.
 * @returns A `NotImplemented` failure.
 */
export const onSetSettings = async (
  _ev: Electron.IpcMainInvokeEvent,
  _request: SetSettingsRequest,
): Promise<IpcResult<SettingsSnapshot>> => ({
  ok: false,
  error: {
    name: "NotImplemented",
    message: "mme:settings:set is not implemented yet (Phase 6).",
  },
});
