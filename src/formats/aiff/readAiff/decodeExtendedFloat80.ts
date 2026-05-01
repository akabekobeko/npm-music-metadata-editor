import { Buffer } from "node:buffer";

/**
 * Decode an IEEE 754 80-bit extended-precision float at `offset` of `bytes`.
 *
 * AIFF stores `sampleRate` as one of these (big-endian) inside the `COMM`
 * chunk; the value is otherwise just an integer like `44100` / `48000`. The
 * 80-bit format is sign (1 bit) + biased exponent (15 bits) + mantissa
 * (64 bits *with explicit leading 1*) — unlike IEEE 754 64-bit there is no
 * implicit leading 1 to deal with.
 *
 * Decoding routes the mantissa through ordinary `number`s; sample rates
 * round-trip exactly because they sit far below 2^53.
 *
 * @param bytes - Source buffer.
 * @param offset - Offset of the 10-byte big-endian field.
 * @returns The decoded value as a `number`. `NaN` / infinities are not
 *   special-cased — callers using this for `sampleRate` should sanity-check
 *   the result is finite and positive.
 */
export const decodeExtendedFloat80 = (bytes: Uint8Array, offset: number): number => {
  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const expField = view.readUInt16BE(offset);
  const sign = expField & 0x8000 ? -1 : 1;
  const exponent = (expField & 0x7fff) - 16383;
  const mantissaHi = view.readUInt32BE(offset + 2);
  const mantissaLo = view.readUInt32BE(offset + 6);
  // value = (mantissa as 64-bit unsigned) × 2^(exponent - 63), split across
  // the two halves so we never form the full 64-bit integer in JS.
  const value = mantissaHi * 2 ** (exponent - 31) + mantissaLo * 2 ** (exponent - 63);
  return sign * value;
};
