import { Buffer } from "node:buffer";

/**
 * Read a 64-bit big-endian unsigned integer at `offset` as a `bigint`.
 *
 * @param source - Source buffer.
 * @param offset - Absolute offset to read from.
 * @returns The decoded value as a `bigint`.
 */
export const readUInt64 = (source: Uint8Array, offset: number): bigint =>
  Buffer.from(source.buffer, source.byteOffset + offset, 8).readBigUInt64BE(0);
