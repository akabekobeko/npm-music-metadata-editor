/**
 * Maximum value representable as an ID3v2 syncsafe 32-bit integer.
 *
 * Each of the four bytes uses only its low 7 bits, so the upper bound is `0x0FFFFFFF`.
 */
export const SYNC_SAFE_INT32_MAX = 0x0fffffff;

/**
 * Decode an ID3v2 syncsafe 32-bit unsigned integer.
 *
 * Syncsafe integers spread their value across four bytes using only the low 7 bits of
 * each byte (the high bit is always zero). This avoids accidental MPEG sync patterns
 * appearing inside ID3v2 size fields.
 *
 * @param bytes Source bytes; the four bytes starting at `offset` are read.
 * @param offset Offset within `bytes` where the syncsafe integer begins. Defaults to `0`.
 * @returns The decoded 28-bit value as a regular `number`.
 * @throws when fewer than `offset + 4` bytes are available, or when any of the four
 *   bytes has its high bit set (which would not be a valid syncsafe encoding).
 */
export const decodeSyncSafeInt32 = (bytes: Uint8Array, offset = 0): number => {
  if (bytes.length < offset + 4) {
    throw new RangeError("decodeSyncSafeInt32: need at least 4 bytes");
  }

  const b0 = bytes[offset] as number;
  const b1 = bytes[offset + 1] as number;
  const b2 = bytes[offset + 2] as number;
  const b3 = bytes[offset + 3] as number;
  if ((b0 | b1 | b2 | b3) & 0x80) {
    throw new RangeError("decodeSyncSafeInt32: high bit set in syncsafe byte");
  }

  return (b0 << 21) | (b1 << 14) | (b2 << 7) | b3;
};

/**
 * Encode an unsigned integer as an ID3v2 syncsafe 32-bit value.
 *
 * @param value Integer in the range `[0, SYNC_SAFE_INT32_MAX]`.
 * @returns A 4-byte `Uint8Array` containing the syncsafe encoding (big-endian).
 * @throws when `value` is negative, non-integer, or exceeds `SYNC_SAFE_INT32_MAX`.
 */
export const encodeSyncSafeInt32 = (value: number): Uint8Array => {
  if (!Number.isInteger(value) || value < 0 || value > SYNC_SAFE_INT32_MAX) {
    throw new RangeError(
      `encodeSyncSafeInt32: value out of range [0, ${SYNC_SAFE_INT32_MAX}]: ${value}`,
    );
  }

  return new Uint8Array([
    (value >>> 21) & 0x7f,
    (value >>> 14) & 0x7f,
    (value >>> 7) & 0x7f,
    value & 0x7f,
  ]);
};
