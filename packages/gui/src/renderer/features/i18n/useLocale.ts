import { useSettings } from "@/features/settings/store";
import { resolveLocale } from "../../../shared/locales/resolveLocale.js";
import { type BoundTranslate, tFor } from "../../../shared/locales/t.js";
import type { Locale } from "../../../shared/locales/types.js";

/** Locale-bound translation helper re-exported for callers outside React. */
export type TranslateFn = BoundTranslate;

/**
 * Active locale plus a bound `t` helper.
 *
 * The dictionary modules live in `src/shared/locales/` so both the Node-side
 * menu builder and the Renderer can read them without either side reaching
 * across the process boundary.
 *
 * @returns `{ locale, t }`.
 */
export const useLocale = (): { readonly locale: Locale; readonly t: TranslateFn } => {
  const [settings] = useSettings();
  const locale = resolveLocale({
    preference: settings.locale,
    systemLocale: navigator.language,
  });
  const t = tFor(locale);
  return { locale, t };
};
