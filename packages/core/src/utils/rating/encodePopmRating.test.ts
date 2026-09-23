import { expect, it } from "vitest";
import { encodePopmRating } from "./encodePopmRating.js";

it.each([
  [0, 0],
  [0.1, 13],
  [0.2, 1],
  [0.3, 54],
  [0.4, 64],
  [0.5, 118],
  [0.6, 128],
  [0.7, 186],
  [0.8, 196],
  [0.9, 242],
  [1, 255],
])("maps the half-star value %d to POPM byte %d", (rating, expected) => {
  expect(encodePopmRating(rating)).toBe(expected);
});

it("snaps intermediate values to the nearest half star", () => {
  expect(encodePopmRating(0.56)).toBe(128);
  expect(encodePopmRating(0.04)).toBe(0);
  expect(encodePopmRating(0.06)).toBe(13);
});

it("clamps out-of-range values", () => {
  expect(encodePopmRating(-1)).toBe(0);
  expect(encodePopmRating(7)).toBe(255);
});
