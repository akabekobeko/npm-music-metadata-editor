/** Bytes for the `"fLaC"` magic that opens every FLAC stream. */
export const FLAC_SIGNATURE = new Uint8Array([0x66, 0x4c, 0x61, 0x43]);

/** Length of the FLAC stream marker (`"fLaC"`). */
export const FLAC_SIGNATURE_SIZE = 4;

/** Length of a metadata block header (`is_last:1 + type:7 + length:24`). */
export const FLAC_METADATA_BLOCK_HEADER_SIZE = 4;

/** Length of a STREAMINFO block body (the spec mandates exactly 34 bytes). */
export const FLAC_STREAMINFO_SIZE = 34;

/** Bit mask for the "last metadata block" flag in the metadata block header. */
export const FLAC_LAST_BLOCK_FLAG = 0x80;

/** Mask isolating the 7-bit block type within the first header byte. */
export const FLAC_BLOCK_TYPE_MASK = 0x7f;

/**
 * Metadata block types as defined by the FLAC format specification.
 *
 * `Invalid` (`127`) is reserved by the spec and ignored on read.
 */
export const FlacBlockType = {
  /** Stream-level audio properties (mandatory, always the first block). */
  StreamInfo: 0,
  /** Filler bytes; reorganised on write to keep audio in place. */
  Padding: 1,
  /** Application-specific data, opaque to this library. */
  Application: 2,
  /** Seek points for fast scrubbing. */
  SeekTable: 3,
  /** Vorbis Comment block (text-based metadata). */
  VorbisComment: 4,
  /** Cue sheet (track / index data). */
  CueSheet: 5,
  /** Embedded picture in a normalised key-prefixed structure. */
  Picture: 6,
} as const;

/** Numeric value drawn from {@link FlacBlockType}. */
export type FlacBlockTypeValue = (typeof FlacBlockType)[keyof typeof FlacBlockType];

/**
 * Default size in bytes of the padding block emitted when the existing
 * metadata region is too small to absorb a Vorbis Comment growth.
 *
 * Mirrors the value commonly used by `metaflac` / libFLAC so that subsequent
 * tag edits are likely to fit without rewriting the audio payload again.
 */
export const FLAC_DEFAULT_NEW_PADDING_BYTES = 8192;
