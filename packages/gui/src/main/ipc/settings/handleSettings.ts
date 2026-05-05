import type { IpcResponseOf } from "../../../shared/ipc-contract.js";

/**
 * Phase 2 stub for `mme:settings:get`.
 *
 * Renderer code can call the channel today and branch on the `NotImplemented`
 * error; Phase 6 will replace the stub with a real `electron-store`-backed
 * implementation.
 *
 * @returns A `NotImplemented` failure.
 */
export const handleSettingsGet = async (): Promise<IpcResponseOf<"mme:settings:get">> => ({
  ok: false,
  error: {
    name: "NotImplemented",
    message: "mme:settings:get is not implemented yet (Phase 6).",
  },
});

/**
 * Phase 2 stub for `mme:settings:set`.
 *
 * Mirror of {@link handleSettingsGet} so Renderer code paths can be exercised
 * before the real persistence layer is wired up.
 *
 * @returns A `NotImplemented` failure.
 */
export const handleSettingsSet = async (): Promise<IpcResponseOf<"mme:settings:set">> => ({
  ok: false,
  error: {
    name: "NotImplemented",
    message: "mme:settings:set is not implemented yet (Phase 6).",
  },
});
