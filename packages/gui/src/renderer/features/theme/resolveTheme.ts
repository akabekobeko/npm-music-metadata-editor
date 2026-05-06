import type { ResolvedTheme, ThemePreference } from "./types.js";

/** Args for {@link resolveTheme}. */
type Args = {
  /** Persisted preference from `AppSettings.theme`, or `undefined` when unset. */
  readonly preference: ThemePreference | undefined;
  /**
   * `true` when `prefers-color-scheme: dark` matches. Pass-through so the
   * helper stays pure and testable without a `window` global.
   */
  readonly prefersDark: boolean;
};

/**
 * Reduce a "preference + system signal" pair to a concrete theme.
 *
 * Resolution order:
 *   1. Explicit `light` / `dark` preference wins.
 *   2. `system` or `undefined` falls back to `prefers-color-scheme`.
 *
 * @param args - Persisted preference and system signal.
 * @returns The theme that should be applied to the document.
 */
export const resolveTheme = ({ preference, prefersDark }: Args): ResolvedTheme => {
  if (preference === "light" || preference === "dark") {
    return preference;
  }

  return prefersDark ? "dark" : "light";
};
