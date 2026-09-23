import { expect, it } from "vitest";
import { decodePercentRating } from "./decodePercentRating.js";
import { encodePercentRating } from "./encodePercentRating.js";

it("decodes 0..100 percentages", () => {
  expect(decodePercentRating("70")).toBeCloseTo(0.7, 10);
  expect(decodePercentRating(" 100 ")).toBe(1);
  expect(decodePercentRating("55")).toBeCloseTo(0.55, 10);
});

it("decodes 0..5 star counts, including fractional stars", () => {
  expect(decodePercentRating("0")).toBe(0);
  expect(decodePercentRating("3")).toBeCloseTo(0.6, 10);
  expect(decodePercentRating("2.5")).toBeCloseTo(0.5, 10);
  expect(decodePercentRating("5")).toBe(1);
});

it("clamps values above 100 and rejects non-numeric or negative text", () => {
  expect(decodePercentRating("150")).toBe(1);
  expect(decodePercentRating("")).toBeUndefined();
  expect(decodePercentRating("abc")).toBeUndefined();
  expect(decodePercentRating("-1")).toBeUndefined();
});

it("round-trips half-star values through encodePercentRating", () => {
  for (let step = 0; step <= 10; step++) {
    const rating = step / 10;
    expect(decodePercentRating(encodePercentRating(rating))).toBeCloseTo(rating, 10);
  }
});
