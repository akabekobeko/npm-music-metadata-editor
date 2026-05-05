import { expect, it } from "vitest";
import { parseLrc } from "./parseLrc.js";

it("parses a single timestamped line", () => {
  const result = parseLrc("[00:12.300]Foo");

  expect(result.lines).toEqual([{ timeMs: 12_300, text: "Foo" }]);
  expect(result.meta).toEqual({});
});

it("captures metadata tags into the meta bag", () => {
  const result = parseLrc("[ar:Some Artist]\n[ti:Title]\n[00:00.00]Hi");

  expect(result.meta).toEqual({ ar: "Some Artist", ti: "Title" });
  expect(result.lines).toEqual([{ timeMs: 0, text: "Hi" }]);
});

it("supports multiple time tags per line", () => {
  const result = parseLrc("[00:01.000][00:30.000]Chorus");

  expect(result.lines).toEqual([
    { timeMs: 1_000, text: "Chorus" },
    { timeMs: 30_000, text: "Chorus" },
  ]);
});

it("ignores blank and comment lines", () => {
  const result = parseLrc("\n# comment\n[00:01.500]Lyric\n\n");

  expect(result.lines).toEqual([{ timeMs: 1_500, text: "Lyric" }]);
});

it("skips lines whose time tag has out-of-range seconds", () => {
  const result = parseLrc("[00:99.99]Foo\n[00:10.000]Bar");

  expect(result.lines).toEqual([{ timeMs: 10_000, text: "Bar" }]);
});

it("returns lines sorted by timeMs ascending", () => {
  const result = parseLrc("[00:30.000]B\n[00:10.000]A");

  expect(result.lines).toEqual([
    { timeMs: 10_000, text: "A" },
    { timeMs: 30_000, text: "B" },
  ]);
});

it("treats two-digit fractions as centiseconds", () => {
  const result = parseLrc("[00:00.50]Half");

  expect(result.lines).toEqual([{ timeMs: 500, text: "Half" }]);
});

it("returns empty result for empty input", () => {
  const result = parseLrc("");

  expect(result.lines).toEqual([]);
  expect(result.meta).toEqual({});
});
