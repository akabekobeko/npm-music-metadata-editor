import { expect, it } from "vitest";
import { isClearedValue } from "./isClearedValue.js";

it("treats null and the empty string as deletion markers", () => {
  expect(isClearedValue(null)).toBe(true);
  expect(isClearedValue("")).toBe(true);
});

it("does not treat undefined or concrete values as deletion markers", () => {
  expect(isClearedValue(undefined)).toBe(false);
  expect(isClearedValue("x")).toBe(false);
  expect(isClearedValue(0)).toBe(false);
});
