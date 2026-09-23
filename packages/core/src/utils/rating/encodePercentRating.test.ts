import { expect, it } from "vitest";
import { encodePercentRating } from "./encodePercentRating.js";

it("renders the rating on a 0..100 integer scale", () => {
  expect(encodePercentRating(0)).toBe("0");
  expect(encodePercentRating(0.7)).toBe("70");
  expect(encodePercentRating(0.555)).toBe("56");
  expect(encodePercentRating(1)).toBe("100");
});

it("clamps out-of-range values", () => {
  expect(encodePercentRating(-0.5)).toBe("0");
  expect(encodePercentRating(3)).toBe("100");
});
