import { FLAC_BLOCK_TYPE_MASK, FLAC_LAST_BLOCK_FLAG } from "../constants.js";

/** Decoded metadata block header. */
type Header = {
  /** Block type (`0..127`). */
  type: number;
  /** Body length in bytes (24-bit big-endian). */
  length: number;
  /** `true` when this header carries the "last metadata block" flag. */
  isLast: boolean;
};

/**
 * Decode the 4-byte FLAC metadata block header at `offset`.
 *
 * Layout: `is_last:1 + type:7 + length:24 (big endian)`.
 *
 * @param bytes - Buffer containing the header.
 * @param offset - Absolute byte offset of the header inside `bytes`.
 * @returns The decoded `is_last` flag, block type, and body length.
 * @throws RangeError when `offset` would read past the end of `bytes`.
 */
export const parseMetadataBlockHeader = (bytes: Uint8Array, offset: number): Header => {
  if (offset + 4 > bytes.length) {
    throw new RangeError(
      `parseMetadataBlockHeader: 4-byte header at offset ${offset} exceeds buffer length ${bytes.length}`,
    );
  }

  // Local non-null bindings keep `noUncheckedIndexedAccess` happy without
  // sprinkling `!` everywhere.
  const first = bytes[offset] as number;
  const b1 = bytes[offset + 1] as number;
  const b2 = bytes[offset + 2] as number;
  const b3 = bytes[offset + 3] as number;
  const length = (b1 << 16) | (b2 << 8) | b3;
  return {
    isLast: (first & FLAC_LAST_BLOCK_FLAG) !== 0,
    type: first & FLAC_BLOCK_TYPE_MASK,
    length,
  };
};
