import { expect, it } from "vitest";
import { removeUnsynchronization } from "./removeUnsynchronization.js";

it("returns the input unchanged when no 0xFF 0x00 pair is present", () => {
  const input = new Uint8Array([0x00, 0x10, 0xff, 0xe0, 0x42]);
  const out = removeUnsynchronization(input);
  expect(out).toBe(input);
});

it("collapses every 0xFF 0x00 pair back to a single 0xFF", () => {
  const input = new Uint8Array([0xff, 0x00, 0xff, 0x00, 0xe0]);
  const out = removeUnsynchronization(input);
  expect(Array.from(out)).toEqual([0xff, 0xff, 0xe0]);
});

it("preserves trailing 0xFF without a following 0x00", () => {
  const input = new Uint8Array([0x12, 0xff]);
  expect(Array.from(removeUnsynchronization(input))).toEqual([0x12, 0xff]);
});

it("leaves 0xFF 0x00 within an otherwise normal sequence intact when followed by another byte", () => {
  // The input contains exactly one escape (0xFF 0x00) plus a 0x10 trailer.
  const input = new Uint8Array([0xab, 0xff, 0x00, 0x10]);
  expect(Array.from(removeUnsynchronization(input))).toEqual([0xab, 0xff, 0x10]);
});

it("returns an empty buffer when given empty input", () => {
  const out = removeUnsynchronization(new Uint8Array());
  expect(out.length).toBe(0);
});
