import { useEffect, useState } from "react";
import { useSettings } from "@/features/settings/store";
import { resolveTheme } from "./resolveTheme.js";
import type { ResolvedTheme } from "./types.js";

/**
 * Apply the active theme to the document and expose the resolved value.
 *
 * Behaviour:
 *
 * - Reads `AppSettings.theme` and combines it with `prefers-color-scheme` to
 *   pick a concrete theme (see {@link resolveTheme}).
 * - Mirrors the result onto `document.documentElement.classList` (`dark` /
 *   `light`) so Tailwind's dark variants resolve.
 * - Subscribes to the system media query so unset preferences track the OS
 *   without a manual reload.
 *
 * @returns The resolved theme actually applied to the document.
 */
export const useTheme = (): ResolvedTheme => {
  const [settings] = useSettings();
  const [prefersDark, setPrefersDark] = useState<boolean>(() =>
    typeof window === "undefined"
      ? false
      : window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent): void => setPrefersDark(event.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved = resolveTheme({ preference: settings.theme, prefersDark });

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.dataset.theme = resolved;
  }, [resolved]);

  return resolved;
};
