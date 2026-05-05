import { createMmeError } from "@akabeko/music-metadata-editor";
import { describe, expect, it } from "vitest";
import { toIpcError } from "./toIpcError.js";

describe("toIpcError", () => {
  it("preserves name / code / message of an MmeError", () => {
    const error = createMmeError({
      code: "unsupported-format",
      message: "no reader registered",
    });

    expect(toIpcError(error)).toEqual({
      name: "MmeError",
      code: "unsupported-format",
      message: "no reader registered",
    });
  });

  it("drops `cause` from an MmeError", () => {
    const cause = new Error("underlying");
    const error = createMmeError({
      code: "invalid-tag",
      message: "bad frame",
      cause,
    });

    const serialised = toIpcError(error);

    expect(serialised).not.toHaveProperty("cause");
    expect(serialised.code).toBe("invalid-tag");
  });

  it("returns name / message without code for a generic Error", () => {
    const error = new TypeError("boom");

    expect(toIpcError(error)).toEqual({
      name: "TypeError",
      message: "boom",
    });
  });

  it("falls back to Error when name is empty string", () => {
    const error = new Error("x");
    error.name = "";

    expect(toIpcError(error)).toEqual({
      name: "Error",
      message: "x",
    });
  });

  it("wraps a primitive (number) as Error", () => {
    expect(toIpcError(123)).toEqual({
      name: "Error",
      message: "123",
    });
  });

  it("wraps null as Error", () => {
    expect(toIpcError(null)).toEqual({
      name: "Error",
      message: "null",
    });
  });

  it("wraps a plain object as Error using String()", () => {
    expect(toIpcError({ foo: "bar" })).toEqual({
      name: "Error",
      message: "[object Object]",
    });
  });
});
