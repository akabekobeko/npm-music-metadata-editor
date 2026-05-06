import type { Locale } from "./types.js";

/**
 * Locale used as the floor when nothing else resolves.
 *
 * Picked as English because Renderer console / electron-log output is
 * intentionally English (= debuggable across crashes regardless of the
 * user's UI language).
 */
export const FALLBACK_LOCALE: Locale = "en";

/** Every locale identifier the dictionary registry knows about. */
export const SUPPORTED_LOCALES: readonly Locale[] = ["en", "ja"];
