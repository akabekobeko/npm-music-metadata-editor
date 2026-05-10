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

/** Map of placeholder name to substitution value (numbers are coerced to string). */
export type TranslationParams = Readonly<Record<string, string | number>>;

/**
 * Locale-bound translation helper produced by {@link tFor}.
 *
 * Always shaped as `(key, params?)` so callers do not need to repeat the
 * locale on every call.
 */
export type BoundTranslate = (key: string, params?: TranslationParams) => string;

/**
 * Look up a translation, falling back to {@link FALLBACK_LOCALE} and finally
 * to the key itself when no dictionary covers it.
 *
 * Curried so callers can either bind a locale once via {@link tFor} (the
 * Renderer / Main React + menu paths) or call this short form when a one-off
 * lookup is fine. The biome `useMaxParams` rule (max=2) forces the bound form
 * to carry the optional `params` slot — see {@link tFor}.
 *
 * @param key - Dot-separated translation key (e.g. `"menu.file.openFiles"`).
 * @param locale - Target locale; pass `FALLBACK_LOCALE` when the user has
 *   not customised their setting.
 * @returns The translated string, the fallback-locale string, or the key
 *   itself when neither resolves.
 */
export const t = (key: string, locale: Locale): string => lookup(key, locale);

/**
 * Bind {@link t} to a locale and expose `{name}` placeholder interpolation.
 *
 * Use this when the consumer needs both interpolation and a stable locale —
 * which is everything React (`useLocale`) and the format-summary helpers do.
 *
 * @param locale - Locale all subsequent lookups should target.
 * @returns A `(key, params?) => string` helper.
 */
export const tFor =
  (locale: Locale): BoundTranslate =>
  (key, params) => {
    const template = lookup(key, locale);
    return params === undefined ? template : interpolate(template, params);
  };

/**
 * Resolve `key` to a raw template, falling through the standard dictionary
 * cascade.
 *
 * Shared by both {@link t} and {@link tFor} so the fallback / warning
 * behaviour stays single-sourced. Emits one `console.warn` per key that
 * misses every dictionary, deduplicated through {@link warnedKeys}.
 *
 * @param key - Translation key.
 * @param locale - Preferred locale to read first.
 * @returns The dictionary entry, the English fallback, or `key` itself.
 */
const lookup = (key: string, locale: Locale): string => {
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
 * Replace `{name}` placeholders in `template` with values from `params`.
 *
 * Placeholders without a matching key are left untouched (rather than
 * silently emptied) so a missing substitution surfaces visually in the UI
 * instead of disappearing.
 *
 * @param template - Resolved dictionary string.
 * @param params - Substitution map.
 * @returns The interpolated string.
 */
const interpolate = (template: string, params: TranslationParams): string =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });

/**
 * Clear the "already warned" set used by {@link t}.
 *
 * Test-only escape hatch — production code should never need to call this.
 */
export const resetMissingKeyLog = (): void => {
  warnedKeys.clear();
};
