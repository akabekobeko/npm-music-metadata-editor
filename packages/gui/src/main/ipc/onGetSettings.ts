import type { IpcResult, SettingsSnapshot } from "./types.js";

/**
 * Phase 2 stub for `mme:settings:get`.
 *
 * Renderer code can call the channel today and branch on the `NotImplemented`
 * error; Phase 6 will replace the stub with a real `electron-store`-backed
 * implementation.
 *
 * @param _ev - Electron event object (unused).
 * @returns A `NotImplemented` failure.
 */
export const onGetSettings = async (
  _ev: Electron.IpcMainInvokeEvent,
): Promise<IpcResult<SettingsSnapshot>> => ({
  ok: false,
  error: {
    name: "NotImplemented",
    message: "mme:settings:get is not implemented yet (Phase 6).",
  },
});
