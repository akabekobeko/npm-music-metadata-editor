import { expect, it } from "vitest";
import { decodePopmRating } from "./decodePopmRating.js";
import { encodePopmRating } from "./encodePopmRating.js";

it.each([
  [0, 0],
  [13, 0.1],
  [1, 0.2],
  [54, 0.3],
  [64, 0.4],
  [118, 0.5],
  [128, 0.6],
  [186, 0.7],
  [196, 0.8],
  [242, 0.9],
  [255, 1],
])("decodes the conventional byte %d to %d", (byte, expected) => {
  expect(decodePopmRating(byte)).toBeCloseTo(expected, 10);
});

it("treats 1..5 as a star count and 6..10 as a 0..10 scale", () => {
  expect(decodePopmRating(3)).toBeCloseTo(0.6, 10);
  expect(decodePopmRating(5)).toBe(1);
  expect(decodePopmRating(8)).toBeCloseTo(0.8, 10);
});

it("snaps in-between popularity values to the nearest half star", () => {
  expect(decodePopmRating(100)).toBeCloseTo(0.4, 10);
  expect(decodePopmRating(200)).toBeCloseTo(0.8, 10);
  expect(decodePopmRating(254)).toBeCloseTo(0.9, 10);
});

it("round-trips every half-star value through encodePopmRating", () => {
  for (let step = 0; step <= 10; step++) {
    const rating = step / 10;
    expect(decodePopmRating(encodePopmRating(rating))).toBeCloseTo(rating, 10);
  }
});
