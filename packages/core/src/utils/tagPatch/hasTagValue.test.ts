import { expect, it } from "vitest";
import { hasTagValue } from "./hasTagValue.js";

it("returns true for non-empty strings and numbers (including 0)", () => {
  expect(hasTagValue("Title")).toBe(true);
  expect(hasTagValue(128)).toBe(true);
  expect(hasTagValue(0)).toBe(true);
});

it("returns false for undefined, null and the empty string", () => {
  expect(hasTagValue(undefined)).toBe(false);
  expect(hasTagValue(null)).toBe(false);
  expect(hasTagValue("")).toBe(false);
});
