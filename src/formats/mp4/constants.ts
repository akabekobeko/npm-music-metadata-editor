/**
 * Standard MP4 (ISO BMFF) box header layout.
 *
 * `BOX_HEADER_SIZE` is the canonical 8 bytes (4-byte size + 4-byte type).
 * `LARGE_BOX_HEADER_SIZE` covers the extended-size form (size = 1, followed by
 * an 8-byte 64-bit size).
 */
export const BOX_HEADER_SIZE = 8;
/** Header size when the box uses the 64-bit extended size form. */
export const LARGE_BOX_HEADER_SIZE = 16;

/**
 * Number of bytes the `meta` full-box prepends before its children.
 *
 * The `meta` atom is a *full box* in ISO BMFF: 1-byte version + 3-byte flags
 * (typically all-zero) sit between the standard 8-byte header and the first
 * child atom. Some QuickTime files omit this prefix, so the parser detects
 * which form is in use rather than assuming it.
 */
export const META_VERSION_FLAGS_SIZE = 4;

/**
 * Container atoms that carry nested boxes directly in their payload.
 *
 * The atom tree parser recurses into these and treats anything else as a leaf.
 * `meta` is not in this list because it requires the version-flags handling
 * encoded in {@link META_VERSION_FLAGS_SIZE} — it is parsed via a dedicated
 * branch.
 */
export const CONTAINER_ATOM_TYPES: readonly string[] = [
  "moov",
  "trak",
  "edts",
  "mdia",
  "minf",
  "dinf",
  "stbl",
  "mvex",
  "moof",
  "traf",
  "mfra",
  "udta",
  "ilst",
];

/**
 * Atom types under `ilst` whose payload contains nested `data` (and optionally
 * `mean`/`name`) sub-atoms. iTunes encodes every metadata field this way.
 *
 * The list is open-ended, so the parser treats any 4-character type under
 * `ilst` as a container of `data`/`mean`/`name`. The constant is exported for
 * documentation only — `parseAtomTree` does not consult it directly.
 */
export const ILST_CHILD_LEAF_TYPES: readonly string[] = ["data", "mean", "name"];

/**
 * Type code numbering used by iTunes inside the `data` atom (also called the
 * "well-known type" or "type indicator"). The full registry has many entries;
 * we only enumerate the ones we read or write.
 */
export const ItunesDataType = {
  /** Implicit / reserved (`gnre`, `trkn`, `disk`). */
  Implicit: 0,
  /** UTF-8 text. */
  Utf8: 1,
  /** UTF-16 BE text. */
  Utf16: 2,
  /** S/JIS text (rare). */
  SJis: 3,
  /** HTML text. */
  Html: 6,
  /** XML text. */
  Xml: 7,
  /** UUID (16 bytes). */
  Uuid: 8,
  /** ISRC. */
  Isrc: 9,
  /** Big-endian signed integer (1-4 bytes). */
  BeSignedInt: 21,
  /** Big-endian unsigned integer (1-4 bytes). */
  BeUnsignedInt: 22,
  /** Big-endian float 32. */
  Float32: 23,
  /** Big-endian float 64. */
  Float64: 24,
  /** JPEG image. */
  Jpeg: 13,
  /** PNG image. */
  Png: 14,
  /** BMP image. */
  Bmp: 27,
} as const;

/** A value drawn from {@link ItunesDataType}. */
export type ItunesDataTypeValue = (typeof ItunesDataType)[keyof typeof ItunesDataType];

/**
 * Default namespace used when serializing `----` freeform atoms.
 *
 * iTunes itself uses `com.apple.iTunes`. We follow the same convention so
 * that round-tripped fields stay compatible with other MP4 readers.
 */
export const DEFAULT_FREEFORM_NAMESPACE = "com.apple.iTunes";

/**
 * Default `hdlr` payload for the metadata handler (`mdir` / `appl`).
 *
 * iTunes-style `meta` boxes begin with a `hdlr` of this exact shape; without
 * it some readers refuse to parse the `ilst` that follows. The 25-byte payload
 * holds the FullBox version+flags, the standard ISO BMFF `pre_defined` /
 * `handler_type` / `reserved[3]` block (with `"appl"` as the first reserved
 * word, matching QuickTime convention), and a single NUL byte for the empty
 * `name` string at the end.
 */
export const ITUNES_HDLR_PAYLOAD: Uint8Array = new Uint8Array([
  // version + flags
  0x00, 0x00, 0x00, 0x00,
  // pre_defined
  0x00, 0x00, 0x00, 0x00,
  // handler_type = "mdir"
  0x6d, 0x64, 0x69, 0x72,
  // reserved[0] = "appl"
  0x61, 0x70, 0x70, 0x6c,
  // reserved[1] + reserved[2]
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  // empty handler name (single NUL byte)
  0x00,
]);
