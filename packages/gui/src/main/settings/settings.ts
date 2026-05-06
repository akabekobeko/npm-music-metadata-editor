import { SETTINGS_FLUSH_DEBOUNCE_MS } from "./constants.js";
import { defaultSettings } from "./defaults.js";
import { loadSettingsSync } from "./loadSettingsSync.js";
import { mergeSettings } from "./mergeSettings.js";
import { saveSettings, saveSettingsSync } from "./saveSettings.js";
import type { AppSettings, DeepPartial } from "./types.js";

/**
 * In-memory state of the settings store.
 *
 * Re-created on every `initialize` call (mostly for tests that need a clean
 * slate). The Main process holds at most one instance at a time; the
 * singleton is exported as functions, not as a `class`, to stay aligned with
 * the project's "no classes" rule.
 */
type StoreState = {
  /** Directory passed to {@link initializeSettings}; lookups use it for path resolution. */
  readonly userDataDir: string;
  /** Latest settings — may be ahead of what's on disk while a debounced flush is pending. */
  current: AppSettings;
  /** Pending debounce timer, or `null` when no flush is queued. */
  pendingTimer: ReturnType<typeof setTimeout> | null;
};

let state: StoreState | null = null;

/**
 * Hydrate the in-memory cache from `<userDataDir>/settings.json`.
 *
 * Idempotent: re-calling overwrites the existing instance (callers should
 * release first if they care about flushing). The returned snapshot mirrors
 * what `getSettings()` will return until the next patch.
 *
 * @param userDataDir - Directory returned by `app.getPath("userData")`.
 * @returns The hydrated settings snapshot.
 */
export const initializeSettings = (userDataDir: string): AppSettings => {
  if (state !== null && state.pendingTimer !== null) {
    clearTimeout(state.pendingTimer);
  }

  const current = loadSettingsSync(userDataDir);
  state = { userDataDir, current, pendingTimer: null };
  return current;
};

/**
 * Read the current cached settings.
 *
 * Falls back to {@link defaultSettings} when the store has not been
 * initialised yet — that should only happen in unit tests; the Main entry
 * point hooks `initializeSettings` into `app.whenReady`.
 *
 * @returns The current settings snapshot.
 */
export const getSettings = (): AppSettings => state?.current ?? defaultSettings;

/**
 * Apply a deep-partial patch to the cache and schedule a debounced flush.
 *
 * Returns the merged snapshot synchronously so the IPC handler can echo it
 * back without waiting on disk I/O. The flush itself runs at most every
 * {@link SETTINGS_FLUSH_DEBOUNCE_MS} ms.
 *
 * @param patch - Deeply-partial overrides to apply on top of the cache.
 * @returns The new in-memory settings.
 */
export const applySettingsPatch = (patch: DeepPartial<AppSettings>): AppSettings => {
  if (state === null) {
    return defaultSettings;
  }

  const next = mergeSettings(state.current, patch);
  state.current = next;
  scheduleFlush(state);
  return next;
};

/**
 * Cancel any queued flush and write the latest settings to disk synchronously.
 *
 * Wired to Electron's `will-quit` so the user never loses an in-flight
 * adjustment to columns / window / recents on a hard close.
 */
export const releaseSettings = (): void => {
  if (state === null) {
    return;
  }

  if (state.pendingTimer !== null) {
    clearTimeout(state.pendingTimer);
    state.pendingTimer = null;
  }

  try {
    saveSettingsSync(state.userDataDir, state.current);
  } catch (error) {
    console.error("[settings] failed to flush on shutdown", error);
  }

  state = null;
};

/**
 * Force the latest in-memory settings to disk immediately (async).
 *
 * Intended for tests and for the rare caller that wants to wait on disk
 * persistence before proceeding (e.g. about to launch an external editor).
 *
 * @returns Resolves when the file is renamed into place. Rejects on I/O
 *   failure.
 */
export const flushSettings = async (): Promise<void> => {
  if (state === null) {
    return;
  }

  if (state.pendingTimer !== null) {
    clearTimeout(state.pendingTimer);
    state.pendingTimer = null;
  }

  await saveSettings(state.userDataDir, state.current);
};

/**
 * Queue a debounced flush. Replaces any prior queued timer so the most-recent
 * patch always wins.
 *
 * @param store - Store state (mutated in place — `pendingTimer` is updated).
 */
const scheduleFlush = (store: StoreState): void => {
  if (store.pendingTimer !== null) {
    clearTimeout(store.pendingTimer);
  }

  store.pendingTimer = setTimeout(() => {
    store.pendingTimer = null;
    void saveSettings(store.userDataDir, store.current).catch((error) => {
      console.error("[settings] debounced flush failed", error);
    });
  }, SETTINGS_FLUSH_DEBOUNCE_MS);
};
