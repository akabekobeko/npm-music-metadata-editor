import { useMemo } from "react";
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
 * `t` is memoised against the resolved locale so re-renders that don't
 * change locale don't re-create the closure (cheap optimisation; mostly
 * for keeping React DevTools tidy).
 *
 * @returns `{ locale, t }`.
 */
export const useLocale = (): { readonly locale: Locale; readonly t: TranslateFn } => {
  const [settings] = useSettings();
  const locale = useMemo(
    () =>
      resolveLocale({
        preference: settings.locale,
        systemLocale: navigator.language,
      }),
    [settings.locale],
  );

  const t = useMemo(() => tFor(locale), [locale]);
  return { locale, t };
};
