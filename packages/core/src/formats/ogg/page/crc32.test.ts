import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { crc32Ogg } from "./crc32.js";

it("produces 0 for an empty input", () => {
  expect(crc32Ogg(new Uint8Array(0))).toBe(0);
});

it("is deterministic across runs", () => {
  const data = Buffer.from("the quick brown fox jumps over the lazy dog", "ascii");
  expect(crc32Ogg(data)).toBe(crc32Ogg(data));
});

it("matches the bit-by-bit reference for a small input", () => {
  const data = Buffer.from("abc", "ascii");
  expect(crc32Ogg(data)).toBe(referenceCrc(data));
});

it("matches the bit-by-bit reference for byte 0x80 (table corner case)", () => {
  // Byte 0x80 forces the polynomial XOR on the very first shift; verifying
  // it explicitly guards the lookup-table builder against off-by-one
  // mistakes in the high-bit branch.
  expect(crc32Ogg(new Uint8Array([0x80]))).toBe(referenceCrc(new Uint8Array([0x80])));
});

it("matches the bit-by-bit reference for a 27-byte zeroed page header", () => {
  const zeroHeader = new Uint8Array(27);
  expect(crc32Ogg(zeroHeader)).toBe(referenceCrc(zeroHeader));
});

/**
 * Bit-by-bit Ogg CRC32 — slow but spec-faithful per RFC 3533 §6, used purely
 * to cross-check the production table-driven implementation.
 *
 * @param data - Bytes to checksum.
 * @returns The 32-bit CRC value.
 */
const referenceCrc = (data: Uint8Array): number => {
  const polynomial = 0x04c11db7;
  let crc = 0;
  for (const byte of data) {
    crc = (crc ^ (byte << 24)) >>> 0;
    for (let i = 0; i < 8; i++) {
      crc = (crc & 0x80000000) !== 0 ? ((crc << 1) ^ polynomial) >>> 0 : (crc << 1) >>> 0;
    }
  }

  return crc >>> 0;
};
