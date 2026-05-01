/** ASCII bytes for the `"APETAGEX"` magic that opens both APE tag headers and footers. */
export const APE_MAGIC = new Uint8Array([0x41, 0x50, 0x45, 0x54, 0x41, 0x47, 0x45, 0x58]);

/** Total size of the APE tag header / footer in bytes (each is the same size). */
export const APE_FOOTER_SIZE = 32;

/** Alias of {@link APE_FOOTER_SIZE} for the optional v2 header at the front of the tag. */
export const APE_HEADER_SIZE = 32;

/** APE tag version codes recognised by the reader. */
export const ApeVersion = {
  /** APE tag v1.0 — no header allowed, Latin-1 / ASCII values. */
  V1: 1000,
  /** APE tag v2.0 — optional header, UTF-8 values, item-level read-only / kind flags. */
  V2: 2000,
} as const;

/** APE tag version drawn from {@link ApeVersion}. */
export type ApeVersionValue = (typeof ApeVersion)[keyof typeof ApeVersion];

/**
 * Bit masks for the 32-bit flags word that lives in the APE header / footer
 * and on each item.
 *
 * Both APE v1 and v2 share the layout — the masks below cover the bits the
 * reader / writer interpret. Bits not listed are reserved and forwarded
 * verbatim through the round-trip.
 */
export const ApeFlags = {
  /** Item is read-only (item-level flag). */
  ReadOnly: 0x00000001,
  /**
   * Item kind mask (bits 1–2). Resolves to one of the {@link ApeItemKind} values.
   *
   * - `0` → text (UTF-8)
   * - `1` → binary
   * - `2` → external (URL / locator)
   * - `3` → reserved
   */
  ItemKindMask: 0x00000006,
  /** Tag contains a footer (always set on a well-formed APE v2 tag). */
  HasFooter: 0x40000000,
  /** Tag contains a header (only set on v2 when the header is emitted). */
  HasHeader: 0x80000000,
  /** This descriptor is the header (cleared when the descriptor is the footer). */
  IsHeader: 0x20000000,
} as const;

/** Item kind decoded from {@link ApeFlags.ItemKindMask}. */
export const ApeItemKind = {
  /** UTF-8 text value. */
  Text: 0,
  /** Raw binary bytes (cover art, …). */
  Binary: 1,
  /** Locator / URL reference. */
  External: 2,
} as const;

/** Item kind value drawn from {@link ApeItemKind}. */
export type ApeItemKindValue = (typeof ApeItemKind)[keyof typeof ApeItemKind];

/**
 * Default tag-level flags emitted on write for an APE v2 tag with both
 * header + footer.
 *
 * `IsHeader` is OR-ed in for the header descriptor and stripped for the
 * footer, matching the convention used by ATL.NET / mac-sdk reference
 * implementations.
 */
export const APE_DEFAULT_TAG_FLAGS = ApeFlags.HasFooter | ApeFlags.HasHeader;

/** Width of an item header in bytes (size + flags + null-terminated key). */
export const APE_ITEM_HEADER_FIXED_SIZE = 8;
