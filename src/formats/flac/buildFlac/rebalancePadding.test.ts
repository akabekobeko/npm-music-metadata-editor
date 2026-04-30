import { expect, it } from "vitest";
import { FLAC_DEFAULT_NEW_PADDING_BYTES } from "../constants.js";
import { rebalancePadding } from "./rebalancePadding.js";

it("emits no padding when the new content matches the original size exactly", () => {
  const result = rebalancePadding({ existingMetadataSize: 100, nonPaddingSize: 100 });
  expect(result).toEqual({ emitPadding: false, paddingBodyLen: 0 });
});

it("absorbs the gap into a padding block when there's room", () => {
  // Gap = 100 - 80 = 20; subtract 4-byte header → padding body = 16.
  const result = rebalancePadding({ existingMetadataSize: 100, nonPaddingSize: 80 });
  expect(result).toEqual({ emitPadding: true, paddingBodyLen: 16 });
});

it("absorbs an exact 4-byte gap with a zero-body padding block", () => {
  const result = rebalancePadding({ existingMetadataSize: 100, nonPaddingSize: 96 });
  expect(result).toEqual({ emitPadding: true, paddingBodyLen: 0 });
});

it("falls back to the default padding when growth is required", () => {
  const result = rebalancePadding({ existingMetadataSize: 50, nonPaddingSize: 200 });
  expect(result.emitPadding).toBe(true);
  expect(result.paddingBodyLen).toBe(FLAC_DEFAULT_NEW_PADDING_BYTES);
});

it("falls back to growth when the gap is 1..3 bytes (header doesn't fit)", () => {
  const result = rebalancePadding({ existingMetadataSize: 100, nonPaddingSize: 98 });
  // Gap = 2, less than the 4-byte header → grow.
  expect(result.emitPadding).toBe(true);
  expect(result.paddingBodyLen).toBe(FLAC_DEFAULT_NEW_PADDING_BYTES);
});

it("uses the caller-supplied default padding budget when growing", () => {
  const result = rebalancePadding({
    existingMetadataSize: 10,
    nonPaddingSize: 100,
    defaultPaddingBytes: 64,
  });
  expect(result.paddingBodyLen).toBe(64);
});
