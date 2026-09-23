import { expect, it } from "vitest";
import { resolvePatchValue } from "./resolvePatchValue.js";

it("keeps the existing value when the patch is undefined", () => {
  expect(resolvePatchValue(undefined, "Old")).toBe("Old");
  expect(resolvePatchValue(undefined, undefined)).toBeUndefined();
});

it("deletes the value when the patch is null or the empty string", () => {
  expect(resolvePatchValue(null, "Old")).toBeUndefined();
  expect(resolvePatchValue("", "Old")).toBeUndefined();
  expect(resolvePatchValue<number>(null, 128)).toBeUndefined();
});

it("overrides the existing value when the patch carries one", () => {
  expect(resolvePatchValue("New", "Old")).toBe("New");
  expect(resolvePatchValue(0, 128)).toBe(0);
});
