import { describe, expect, it } from "vitest";
import { SYNC_SAFE_INT32_MAX } from "./constants.js";
import { decodeSyncSafeInt32 } from "./decodeSyncSafeInt32.js";
import { encodeSyncSafeInt32 } from "./encodeSyncSafeInt32.js";

describe("decodeSyncSafeInt32", () => {
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
});

describe("encodeSyncSafeInt32", () => {
  it("encodes the all-zero boundary", () => {
    expect(encodeSyncSafeInt32(0)).toEqual(new Uint8Array([0, 0, 0, 0]));
  });

  it("encodes the upper boundary", () => {
    expect(encodeSyncSafeInt32(SYNC_SAFE_INT32_MAX)).toEqual(
      new Uint8Array([0x7f, 0x7f, 0x7f, 0x7f]),
    );
  });

  it("rejects negative values", () => {
    expect(() => encodeSyncSafeInt32(-1)).toThrow(RangeError);
  });

  it("rejects values above the maximum", () => {
    expect(() => encodeSyncSafeInt32(SYNC_SAFE_INT32_MAX + 1)).toThrow(RangeError);
  });

  it("rejects non-integers", () => {
    expect(() => encodeSyncSafeInt32(1.5)).toThrow(RangeError);
  });
});

describe("syncsafe round trip", () => {
  it.each([
    0,
    1,
    0x7f,
    0x80,
    0xff,
    0x3fff,
    0x100000,
    SYNC_SAFE_INT32_MAX,
  ])("round-trips %d", (value) => {
    expect(decodeSyncSafeInt32(encodeSyncSafeInt32(value))).toBe(value);
  });
});
