import { describe, expect, it } from "vitest";
import { formatLrc } from "./formatLrc.js";
import { parseLrc } from "./parseLrc.js";

describe("formatLrc", () => {
  it("emits one [mm:ss.xx]text line per entry", () => {
    expect(
      formatLrc([
        { timeMs: 0, text: "Hello" },
        { timeMs: 1500, text: "World" },
      ]),
    ).toBe("[00:00.00]Hello\n[00:01.50]World");
  });

  it("returns an empty string for an empty list", () => {
    expect(formatLrc([])).toBe("");
  });

  it("clamps negative timestamps at zero", () => {
    expect(formatLrc([{ timeMs: -1000, text: "x" }])).toBe("[00:00.00]x");
  });

  it("renders sub-centisecond precision via centiseconds", () => {
    expect(formatLrc([{ timeMs: 1234, text: "abc" }])).toBe("[00:01.23]abc");
  });

  it("round-trips through parseLrc with centisecond precision intact", () => {
    const original = [
      { timeMs: 0, text: "Line 1" },
      { timeMs: 1500, text: "Line 2" },
      { timeMs: 12_340, text: "Line 3" },
    ];
    expect(parseLrc(formatLrc(original))).toEqual(original);
  });
});
