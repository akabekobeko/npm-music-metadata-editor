import { Buffer } from "node:buffer";

/**
 * Read a 32-bit big-endian unsigned integer at `offset`.
 *
 * @param source - Source buffer.
 * @param offset - Absolute offset to read from.
 * @returns The decoded value in `[0, 0xFFFFFFFF]`.
 */
export const readUInt32 = (source: Uint8Array, offset: number): number =>
  Buffer.from(source.buffer, source.byteOffset + offset, 4).readUInt32BE(0);
