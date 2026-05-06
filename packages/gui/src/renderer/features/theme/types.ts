/**
 * User-selectable theme preference persisted in `AppSettings.theme`.
 *
 * `system` (the default when unset) tracks `prefers-color-scheme`. The
 * resolved value applied to the DOM is always `"light"` or `"dark"` —
 * `system` never reaches the document class list.
 */
export type ThemePreference = "light" | "dark" | "system";

/** Concrete theme actually applied to the document. */
export type ResolvedTheme = "light" | "dark";
