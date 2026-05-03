import { Buffer } from "node:buffer";

/**
 * Encode a signed integer using the smallest BE representation that fits.
 *
 * @param value - Signed integer to encode.
 * @returns The encoded bytes (1, 2, or 4 bytes).
 */
export const encodeSignedBe = (value: number): Uint8Array => {
  if (value >= -0x80 && value <= 0x7f) {
    const out = Buffer.alloc(1);
    out.writeInt8(value, 0);
    return new Uint8Array(out);
  }

  if (value >= -0x8000 && value <= 0x7fff) {
    const out = Buffer.alloc(2);
    out.writeInt16BE(value, 0);
    return new Uint8Array(out);
  }

  const out = Buffer.alloc(4);
  out.writeInt32BE(value, 0);
  return new Uint8Array(out);
};
