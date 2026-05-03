import { SYNC_SAFE_INT32_MAX } from "./constants.js";

/**
 * Encode an unsigned integer as an ID3v2 syncsafe 32-bit value.
 *
 * @param value - Integer in the range `[0, SYNC_SAFE_INT32_MAX]`.
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
