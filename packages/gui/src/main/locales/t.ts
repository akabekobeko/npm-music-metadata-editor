import { FALLBACK_LOCALE } from "./constants.js";
import { dictionaries } from "./dictionaries.js";
import type { Locale } from "./types.js";

/**
 * Tracks which keys have already been warned about so a missing translation
 * only surfaces once per process.
 *
 * Module-level state is intentional: the set is process-global because the
 * dictionaries themselves are. Tests reset it through {@link resetMissingKeyLog}.
 */
const warnedKeys = new Set<string>();

/**
 * Look up a translation, falling back to {@link FALLBACK_LOCALE} and finally
 * to the key itself when no dictionary covers it.
 *
 * The function emits one `console.warn` per missing key (deduplicated via
 * {@link warnedKeys}) so unit tests can assert "exactly one warning per
 * unknown key" without triggering a flood from React re-renders.
 *
 * @param key - Dot-separated translation key (e.g. `"menu.file.openFiles"`).
 * @param locale - Target locale; pass `FALLBACK_LOCALE` when the user has
 *   not customised their setting.
 * @returns The translated string, the fallback-locale string, or the key
 *   itself when neither resolves.
 */
export const t = (key: string, locale: Locale): string => {
  const primary = dictionaries[locale][key];
  if (primary !== undefined) {
    return primary;
  }

  const fallback = dictionaries[FALLBACK_LOCALE][key];
  if (fallback !== undefined) {
    return fallback;
  }

  if (!warnedKeys.has(key)) {
    warnedKeys.add(key);
    console.warn(`[i18n] missing translation key: ${key}`);
  }

  return key;
};

/**
 * Clear the "already warned" set used by {@link t}.
 *
 * Test-only escape hatch — production code should never need to call this.
 */
export const resetMissingKeyLog = (): void => {
  warnedKeys.clear();
};
