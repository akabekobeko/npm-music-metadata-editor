import { expect, it } from "vitest";
import { createMmeError, isMmeError } from "./mmeError.js";

it("createMmeError produces an Error with name, code, and message", () => {
  const error = createMmeError({ code: "unsupported-format", message: "no format detected" });
  expect(error).toBeInstanceOf(Error);
  expect(error.name).toBe("MmeError");
  expect(error.code).toBe("unsupported-format");
  expect(error.message).toBe("no format detected");
  expect(error.cause).toBeUndefined();
});

it("createMmeError forwards cause when provided", () => {
  const original = new Error("boom");
  const error = createMmeError({ code: "invalid-tag", message: "bad tag", cause: original });
  expect(error.cause).toBe(original);
});

it("isMmeError returns true for values produced by createMmeError", () => {
  const error = createMmeError({ code: "truncated-input", message: "ran out of bytes" });
  expect(isMmeError(error)).toBe(true);
});

it("isMmeError returns false for unrelated values", () => {
  expect(isMmeError(new Error("plain"))).toBe(false);
  expect(isMmeError("string")).toBe(false);
  expect(isMmeError(undefined)).toBe(false);
  expect(isMmeError({ name: "MmeError", code: "invalid-tag", message: "x" })).toBe(false);
});

it("MmeError can be thrown and caught with code preserved", () => {
  try {
    throw createMmeError({ code: "unsupported-feature", message: "encrypted frames" });
  } catch (error) {
    expect(isMmeError(error)).toBe(true);
    if (isMmeError(error)) {
      expect(error.code).toBe("unsupported-feature");
    }
  }
});
