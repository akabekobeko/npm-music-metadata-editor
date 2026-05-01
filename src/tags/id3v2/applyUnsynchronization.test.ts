import { expect, it } from "vitest";
import { applyUnsynchronization } from "./applyUnsynchronization.js";
import { removeUnsynchronization } from "./removeUnsynchronization/removeUnsynchronization.js";

it("returns the input unchanged when no 0xFF bytes are present", () => {
  const input = new Uint8Array([0x00, 0x10, 0x7f, 0xe0]);
  const out = applyUnsynchronization(input);
  expect(out).toBe(input);
});

it("escapes every 0xFF byte by inserting a trailing 0x00", () => {
  const input = new Uint8Array([0xff, 0x12, 0xff, 0xff]);
  const out = applyUnsynchronization(input);
  expect(Array.from(out)).toEqual([0xff, 0x00, 0x12, 0xff, 0x00, 0xff, 0x00]);
});

it("handles a 0xFF at the very end", () => {
  const input = new Uint8Array([0x10, 0x20, 0xff]);
  expect(Array.from(applyUnsynchronization(input))).toEqual([0x10, 0x20, 0xff, 0x00]);
});

it("returns an empty buffer when given empty input", () => {
  const out = applyUnsynchronization(new Uint8Array());
  expect(out.length).toBe(0);
});

it("round-trips with removeUnsynchronization", () => {
  const samples = [
    new Uint8Array(),
    new Uint8Array([0x00]),
    new Uint8Array([0xff]),
    new Uint8Array([0xff, 0xff, 0xff]),
    new Uint8Array([0x12, 0xff, 0x34, 0xff, 0xe0, 0x56]),
  ];
  for (const sample of samples) {
    const round = removeUnsynchronization(applyUnsynchronization(sample));
    expect(Array.from(round)).toEqual(Array.from(sample));
  }
});
