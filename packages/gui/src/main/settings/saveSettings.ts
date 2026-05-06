import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { SETTINGS_FILE_NAME, SETTINGS_TMP_SUFFIX } from "./constants.js";
import type { AppSettings } from "./types.js";

/**
 * Atomically persist settings to `<userDataDir>/settings.json`.
 *
 * Strategy: write to `settings.json.tmp` first, then `rename()` over the final
 * file. POSIX guarantees `rename` is atomic on the same filesystem, so the
 * caller never sees a half-written `settings.json` even on crashes / power
 * loss between the write and the rename.
 *
 * Errors are surfaced to the caller (the IPC handler logs them); we don't
 * eat them here because a save failure is more useful as a returned error
 * than as a silent revert to defaults.
 *
 * @param userDataDir - Directory returned by `app.getPath("userData")`.
 * @param settings - Snapshot to write.
 * @returns Resolves when the rename completes.
 */
export const saveSettings = async (userDataDir: string, settings: AppSettings): Promise<void> => {
  const finalPath = path.join(userDataDir, SETTINGS_FILE_NAME);
  const tmpPath = `${finalPath}${SETTINGS_TMP_SUFFIX}`;
  await mkdir(userDataDir, { recursive: true });
  await writeFile(tmpPath, serialize(settings), "utf8");
  await rename(tmpPath, finalPath);
};

/**
 * Synchronous mirror of {@link saveSettings} for shutdown paths.
 *
 * Electron's `will-quit` is the last hook before the process exits and only
 * synchronous work survives it on every platform. This function exists so the
 * debounced flush can be promoted to a final guaranteed write on quit.
 *
 * @param userDataDir - Directory returned by `app.getPath("userData")`.
 * @param settings - Snapshot to write.
 */
export const saveSettingsSync = (userDataDir: string, settings: AppSettings): void => {
  const finalPath = path.join(userDataDir, SETTINGS_FILE_NAME);
  const tmpPath = `${finalPath}${SETTINGS_TMP_SUFFIX}`;
  mkdirSync(userDataDir, { recursive: true });
  writeFileSync(tmpPath, serialize(settings), "utf8");
  renameSync(tmpPath, finalPath);
};

/**
 * Stringify settings with stable two-space indentation.
 *
 * Two-space JSON keeps the file reviewable when a user pokes at it directly,
 * which is the only sane debugging path the desktop app exposes.
 *
 * @param settings - Snapshot to serialise.
 * @returns The JSON text written to disk.
 */
const serialize = (settings: AppSettings): string => `${JSON.stringify(settings, null, 2)}\n`;
