import { Buffer } from "node:buffer";

/**
 * Concatenate one or more `Uint8Array` chunks into a single buffer.
 *
 * @param parts - Chunks to concatenate, in order.
 * @returns A new buffer holding the concatenated bytes.
 */
export const concat = (parts: readonly Uint8Array[]): Uint8Array => {
  const buf = Buffer.concat(parts.map((p) => Buffer.from(p.buffer, p.byteOffset, p.byteLength)));
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};
