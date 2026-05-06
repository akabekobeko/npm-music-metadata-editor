import { getSettings } from "../settings/settings.js";
import type { IpcResult, SettingsSnapshot } from "./types.js";

/**
 * Channel handler for `mme:settings:get`.
 *
 * Reads from the in-memory cache hydrated by `initializeSettings` at startup.
 * The cache fronts the on-disk JSON so this handler never performs blocking
 * I/O — Renderer can call it freely (e.g. from a column-picker `useEffect`).
 *
 * @param _ev - Electron event object (unused).
 * @returns The current settings snapshot.
 */
export const onGetSettings = async (
  _ev: Electron.IpcMainInvokeEvent,
): Promise<IpcResult<SettingsSnapshot>> => ({
  ok: true,
  value: getSettings(),
});
