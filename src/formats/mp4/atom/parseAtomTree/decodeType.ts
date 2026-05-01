import { Buffer } from "node:buffer";

/** Number of bytes consumed by an `Atom.type` field. */
const TYPE_LENGTH = 4;

/**
 * Decode 4 bytes as the ASCII / Latin-1 atom type. Atom types include
 * non-ASCII bytes (e.g. `"©nam"` whose first byte is `0xA9`); decoding via
 * Latin-1 keeps the round-trip lossless.
 *
 * @param source - Source buffer.
 * @param offset - Absolute offset of the 4 bytes to decode.
 * @returns 4-character atom type string.
 */
export const decodeType = (source: Uint8Array, offset: number): string =>
  Buffer.from(source.buffer, source.byteOffset + offset, TYPE_LENGTH).toString("latin1");
