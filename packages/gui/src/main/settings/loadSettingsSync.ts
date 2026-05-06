import { readFileSync } from "node:fs";
import path from "node:path";
import { SETTINGS_FILE_NAME } from "./constants.js";
import { defaultSettings } from "./defaults.js";
import { mergeSettings } from "./mergeSettings.js";
import type { AppSettings, DeepPartial } from "./types.js";

/**
 * Read and validate `settings.json` synchronously at app startup.
 *
 * Synchronous on purpose: settings are needed before the first window is
 * created, and `app.whenReady()` is already a "do everything" gate. Callers
 * that prefer the async path should still go through the IPC handler, not
 * here.
 *
 * Failure is **swallowed** by design: missing file, unreadable file, or
 * malformed JSON each fall back to {@link defaultSettings}. The next
 * `setSettings` call writes the healed file, so the user is never stuck with
 * a corrupted blob.
 *
 * Unknown keys on disk are dropped during the merge — see `mergeSettings`.
 *
 * @param userDataDir - Directory returned by `app.getPath("userData")`.
 * @returns The parsed settings, or `defaultSettings` when the file is missing
 *   or invalid.
 */
export const loadSettingsSync = (userDataDir: string): AppSettings => {
  const filePath = path.join(userDataDir, SETTINGS_FILE_NAME);
  const raw = readFile(filePath);
  if (raw === undefined) {
    return defaultSettings;
  }

  const parsed = parseJson(raw);
  if (parsed === undefined) {
    return defaultSettings;
  }

  return mergeSettings(defaultSettings, parsed);
};

/**
 * Read a UTF-8 file synchronously, returning `undefined` on any failure.
 *
 * @param filePath - Absolute path to the file.
 * @returns The file's text, or `undefined` when the file is missing /
 *   unreadable.
 */
const readFile = (filePath: string): string | undefined => {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
};

/**
 * Parse a JSON string into a deep-partial settings shape.
 *
 * Anything that doesn't shape-check as a plain object is rejected. The merge
 * step on the caller side then drops fields that don't match the schema,
 * which keeps the migration story local to one function.
 *
 * @param raw - Raw JSON text.
 * @returns A partial settings object on success, or `undefined` when the
 *   payload is malformed.
 */
const parseJson = (raw: string): DeepPartial<AppSettings> | undefined => {
  try {
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return undefined;
    }

    return value as DeepPartial<AppSettings>;
  } catch {
    return undefined;
  }
};
