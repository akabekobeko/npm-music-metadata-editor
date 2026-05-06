import { useMemo } from "react";
import { useSettings } from "@/features/settings/store";
import { resolveLocale } from "../../../main/locales/resolveLocale.js";
import { t as rawT } from "../../../main/locales/t.js";
import type { Locale } from "../../../main/locales/types.js";

/**
 * Active locale plus a bound `t` helper.
 *
 * The dictionary modules live next to Main's menu code (so the menu builder
 * can import them on the Node side); the Renderer reaches across `src/main`
 * the same way the existing `IpcKeys` value-import does.
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
