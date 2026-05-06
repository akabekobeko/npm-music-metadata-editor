/** File name placed under `app.getPath("userData")` for the persisted blob. */
export const SETTINGS_FILE_NAME = "settings.json";

/** Atomic-write temporary file suffix (final rename targets {@link SETTINGS_FILE_NAME}). */
export const SETTINGS_TMP_SUFFIX = ".tmp";

/** Debounce window (ms) between the last `setSettings` call and the disk flush. */
export const SETTINGS_FLUSH_DEBOUNCE_MS = 500;

/** Maximum number of paths retained in `AppSettings.recentFiles`. */
export const RECENT_FILES_LIMIT = 10;
