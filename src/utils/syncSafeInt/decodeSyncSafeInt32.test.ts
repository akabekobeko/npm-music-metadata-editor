import { expect, it } from "vitest";
import { SYNC_SAFE_INT32_MAX } from "./constants.js";
import { decodeSyncSafeInt32 } from "./decodeSyncSafeInt32.js";
import { encodeSyncSafeInt32 } from "./encodeSyncSafeInt32.js";

it("decodes the all-zero boundary", () => {
  expect(decodeSyncSafeInt32(new Uint8Array([0, 0, 0, 0]))).toBe(0);
});

it("decodes the all-0x7F upper boundary", () => {
  expect(decodeSyncSafeInt32(new Uint8Array([0x7f, 0x7f, 0x7f, 0x7f]))).toBe(SYNC_SAFE_INT32_MAX);
});

it("respects the offset argument", () => {
  const bytes = new Uint8Array([0xff, 0xff, 0x00, 0x00, 0x00, 0x01]);
  expect(decodeSyncSafeInt32(bytes, 2)).toBe(1);
});

it("rejects bytes with the high bit set", () => {
  expect(() => decodeSyncSafeInt32(new Uint8Array([0x80, 0, 0, 0]))).toThrow(RangeError);
});

it("rejects too-short input", () => {
  expect(() => decodeSyncSafeInt32(new Uint8Array([0, 0, 0]))).toThrow(RangeError);
});

it.each([
  0,
  1,
  0x7f,
  0x80,
  0xff,
  0x3fff,
  0x100000,
  SYNC_SAFE_INT32_MAX,
])("round-trips %d through encode / decode", (value) => {
  expect(decodeSyncSafeInt32(encodeSyncSafeInt32(value))).toBe(value);
});
