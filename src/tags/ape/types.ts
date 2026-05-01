import type { ApeItemKindValue, ApeVersionValue } from "./constants.js";

/**
 * One item inside an APE tag (`key=value` pair).
 *
 * Text items hold a UTF-8 string in {@link value}; binary / external items
 * keep the raw bytes so callers can decide how to interpret them (cover art
 * bytes, URLs, …). The {@link kind} property disambiguates.
 */
export type ApeItem = {
  /** Item key. ASCII printable characters in `[0x20, 0x7E]`, length 2..255. */
  key: string;
  /** UTF-8 string for {@link ApeItemKind.Text}; raw bytes otherwise. */
  value: string | Uint8Array;
  /** Item kind (text / binary / external). */
  kind: ApeItemKindValue;
  /** `true` when the item-level read-only flag is set. */
  readOnly: boolean;
};

/**
 * Parsed APE tag.
 *
 * Layout (when {@link hasHeader} is `true`): `header (32) + items + footer (32)`.
 * APE v1 never carries a header — items immediately precede the footer.
 */
export type ApeTag = {
  /** Tag version (`1000` for v1.0 or `2000` for v2.0). */
  version: ApeVersionValue;
  /** `true` when the v2 header descriptor is present. */
  hasHeader: boolean;
  /** Items in file order. */
  items: readonly ApeItem[];
  /** Total tag size in bytes including header (when present) + footer. */
  totalSize: number;
};
