/**
 * Two-letter locale identifiers supported by the GUI.
 *
 * The set is intentionally narrow (en / ja) because the dictionaries are
 * hand-authored and every key must exist in both — see
 * `t.test.ts` for the cross-locale parity assertion.
 */
export type Locale = "en" | "ja";

/**
 * Single dictionary mapping translation keys to display strings.
 *
 * The shape is "string → string" so the lookup helper (`t`) stays trivial.
 * Keys are dot-separated (e.g. `"menu.file.openFiles"`) by convention; the
 * helper does not interpret the dots — they only exist to keep the JSON
 * scannable.
 */
export type Dictionary = Readonly<Record<string, string>>;
