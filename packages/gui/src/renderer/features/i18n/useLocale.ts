import { useMemo } from "react";
import { useSettings } from "@/features/settings/store";
import { resolveLocale } from "../../../shared/locales/resolveLocale.js";
import { t as rawT } from "../../../shared/locales/t.js";
import type { Locale } from "../../../shared/locales/types.js";

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
export const useLocale = (): { readonly locale: Locale; readonly t: (key: string) => string } => {
  const [settings] = useSettings();
  const locale = useMemo(
    () =>
      resolveLocale({
        preference: settings.locale,
        systemLocale: navigator.language,
      }),
    [settings.locale],
  );

  const t = useMemo(
    () =>
      (key: string): string =>
        rawT(key, locale),
    [locale],
  );
  return { locale, t };
};
