import { en } from "./en.js";
import { ja } from "./ja.js";
import type { Dictionary, Locale } from "./types.js";

/**
 * Registry mapping each {@link Locale} to its hand-authored dictionary.
 *
 * Defined as a shared lookup so callers (`t`, the parity test, the menu
 * builder) never thread the dictionary value around. New locales register
 * here once their `<locale>.ts` file is in place.
 */
export const dictionaries: Readonly<Record<Locale, Dictionary>> = {
  en,
  ja,
};
