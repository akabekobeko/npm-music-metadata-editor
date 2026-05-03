import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { parseTrackSpec } from "./parseTrackSpec.js";

describe("parseTrackSpec", () => {
  it("parses a bare number", () => {
    expect(parseTrackSpec("3", "--track")).toEqual({ number: 3 });
  });

  it("parses a number/total pair", () => {
    expect(parseTrackSpec("3/12", "--track")).toEqual({ number: 3, total: 12 });
  });

  it("accepts zero", () => {
    expect(parseTrackSpec("0", "--disc")).toEqual({ number: 0 });
  });

  it("rejects a non-numeric segment", () => {
    expect(() => parseTrackSpec("abc", "--track")).toThrow(CommanderError);
  });

  it("rejects negative numbers", () => {
    expect(() => parseTrackSpec("-1/2", "--track")).toThrow(/expected a non-negative integer/);
  });

  it("rejects multiple slashes", () => {
    expect(() => parseTrackSpec("1/2/3", "--track")).toThrow(/expected "<n>"/);
  });

  it("rejects an empty number segment", () => {
    expect(() => parseTrackSpec("/2", "--track")).toThrow(/expected a non-negative integer/);
  });

  it("rejects a trailing slash", () => {
    expect(() => parseTrackSpec("3/", "--track")).toThrow(/expected a non-negative integer/);
  });
});
