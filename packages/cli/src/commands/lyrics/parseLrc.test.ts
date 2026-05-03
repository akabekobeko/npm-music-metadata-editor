import { describe, expect, it } from "vitest";
import { parseLrc } from "./parseLrc.js";

describe("parseLrc", () => {
  it("parses a basic two-line LRC body", () => {
    expect(parseLrc("[00:01.00]First\n[00:02.50]Second\n")).toEqual([
      { timeMs: 1000, text: "First" },
      { timeMs: 2500, text: "Second" },
    ]);
  });

  it("treats 3-digit fractions as milliseconds", () => {
    expect(parseLrc("[00:01.123]Line\n")).toEqual([{ timeMs: 1123, text: "Line" }]);
  });

  it("treats 2-digit fractions as centiseconds", () => {
    expect(parseLrc("[00:01.50]Line\n")).toEqual([{ timeMs: 1500, text: "Line" }]);
  });

  it("expands repeated timestamps into multiple entries", () => {
    expect(parseLrc("[00:01.00][00:05.00]Repeat me")).toEqual([
      { timeMs: 1000, text: "Repeat me" },
      { timeMs: 5000, text: "Repeat me" },
    ]);
  });

  it("ignores ID-tag lines", () => {
    expect(parseLrc("[la:eng]\n[ti:Lyrics]\n[00:00.00]Hello\n")).toEqual([
      { timeMs: 0, text: "Hello" },
    ]);
  });

  it("sorts entries by timeMs ascending", () => {
    expect(parseLrc("[00:05.00]Late\n[00:01.00]Early").map((l) => l.timeMs)).toEqual([1000, 5000]);
  });

  it("returns an empty list for plain text", () => {
    expect(parseLrc("Plain text without timestamps")).toEqual([]);
  });

  it("accepts CRLF line endings", () => {
    expect(parseLrc("[00:01.00]A\r\n[00:02.00]B")).toEqual([
      { timeMs: 1000, text: "A" },
      { timeMs: 2000, text: "B" },
    ]);
  });
});
