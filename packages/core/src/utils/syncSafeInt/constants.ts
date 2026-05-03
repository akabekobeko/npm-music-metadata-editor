/**
 * Maximum value representable as an ID3v2 syncsafe 32-bit integer.
 *
 * Each of the four bytes uses only its low 7 bits, so the upper bound is `0x0FFFFFFF`.
 */
export const SYNC_SAFE_INT32_MAX = 0x0fffffff;
