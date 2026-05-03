/**
 * Read a big-endian unsigned 32-bit integer from `bytes[offset .. +4]`.
 *
 * Avoids constructing an intermediate `Buffer` and uses arithmetic instead of
 * the `<<` operator so the result is always a non-negative `number`.
 *
 * @param bytes - Source bytes.
 * @param offset - Offset where the 4-byte big-endian integer begins.
 * @returns The decoded value in `[0, 0xFFFFFFFF]`.
 */
export const readUInt32BE = (bytes: Uint8Array, offset: number): number =>
  (bytes[offset] as number) * 0x1000000 +
  ((bytes[offset + 1] as number) << 16) +
  ((bytes[offset + 2] as number) << 8) +
  (bytes[offset + 3] as number);
