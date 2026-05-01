import { expect, it } from "vitest";
import { decodeExtendedFloat80 } from "./decodeExtendedFloat80.js";

const encode = (sampleRate: number): Uint8Array => {
  // Build the 10-byte big-endian extended-precision encoding for an integer
  // sample rate: sign 0, biased exponent = unbiased + 16383, mantissa with
  // explicit leading 1 in bit 63 and the integer value packed into the upper
  // bits.
  const bytes = new Uint8Array(10);
  if (sampleRate <= 0) {
    return bytes;
  }

  const exponent = 31 - Math.clz32(sampleRate);
  const expField = exponent + 16383;
  bytes[0] = (expField >> 8) & 0x7f;
  bytes[1] = expField & 0xff;
  // Place `sampleRate` at the top of a 64-bit mantissa with bit 63 = 1.
  const mantissaHi = sampleRate * 2 ** (31 - exponent);
  bytes[2] = (mantissaHi >>> 24) & 0xff;
  bytes[3] = (mantissaHi >>> 16) & 0xff;
  bytes[4] = (mantissaHi >>> 8) & 0xff;
  bytes[5] = mantissaHi & 0xff;
  return bytes;
};

it("decodes 44100 Hz exactly", () => {
  expect(decodeExtendedFloat80(encode(44100), 0)).toBe(44100);
});

it("decodes 48000 Hz exactly", () => {
  expect(decodeExtendedFloat80(encode(48000), 0)).toBe(48000);
});

it("decodes 96000 Hz exactly", () => {
  expect(decodeExtendedFloat80(encode(96000), 0)).toBe(96000);
});

it("respects the offset argument", () => {
  const padding = new Uint8Array([0xff, 0xff, 0xff]);
  const value = encode(22050);
  const merged = new Uint8Array(padding.length + value.length);
  merged.set(padding);
  merged.set(value, padding.length);
  expect(decodeExtendedFloat80(merged, padding.length)).toBe(22050);
});

it("returns 0 for an all-zero encoding (zero exponent + zero mantissa)", () => {
  expect(decodeExtendedFloat80(new Uint8Array(10), 0)).toBe(0);
});

it("flips sign when the leading bit is set", () => {
  const value = encode(44100);
  value[0] = (value[0] ?? 0) | 0x80;
  expect(decodeExtendedFloat80(value, 0)).toBe(-44100);
});
