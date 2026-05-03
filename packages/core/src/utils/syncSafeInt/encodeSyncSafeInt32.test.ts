import { expect, it } from "vitest";
import { SYNC_SAFE_INT32_MAX } from "./constants.js";
import { encodeSyncSafeInt32 } from "./encodeSyncSafeInt32.js";

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
