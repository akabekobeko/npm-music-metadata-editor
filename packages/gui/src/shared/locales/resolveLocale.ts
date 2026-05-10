import { FALLBACK_LOCALE, SUPPORTED_LOCALES } from "./constants.js";
import type { Locale, LocalePreference } from "./types.js";

/**
 * Pick a {@link Locale} for the running process from a "preference + system"
 * pair.
 *
 * Resolution order, mirroring the Phase 7 plan:
 *   1. The user's explicit `AppSettings.locale`, when it names a supported
 *      {@link Locale}. `"system"` and `undefined` skip this rule.
 *   2. The system locale reported by Electron (`app.getLocale()`), normalised
 *      to its language tag (`ja-JP` → `ja`) before matching.
 *   3. {@link FALLBACK_LOCALE} (English) as the floor.
 *
 * Splitting into a pure function keeps Main's startup wiring testable —
 * `app.getLocale()` need not be stubbed; callers pass it in directly.
 *
 * @param args - Persisted locale preference plus the system-reported locale.
 * @returns The resolved locale.
 */
type Args = {
  /**
   * `AppSettings.locale`. `undefined` and `"system"` both fall through to the
   * system locale; only an explicit {@link Locale} short-circuits resolution.
   */
  readonly preference: LocalePreference | undefined;
  /** System locale (e.g. Electron's `app.getLocale()`). */
  readonly systemLocale: string | undefined;
};

export const resolveLocale = ({ preference, systemLocale }: Args): Locale => {
  if (
    preference !== undefined &&
    preference !== "system" &&
    SUPPORTED_LOCALES.includes(preference)
  ) {
    return preference;
  }

  if (systemLocale !== undefined) {
    const language = systemLocale.toLowerCase().split(/[-_]/)[0];
    const match = SUPPORTED_LOCALES.find((locale) => locale === language);
    if (match !== undefined) {
      return match;
    }
  }

  return FALLBACK_LOCALE;
};
