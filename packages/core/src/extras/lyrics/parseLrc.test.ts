import { describe, expect, it } from "vitest";
import { formatLrc } from "./formatLrc.js";
import { parseLrc } from "./parseLrc.js";

it("parses a simple LRC body", () => {
  const lyrics = parseLrc("[00:01.00]First\n[00:02.50]Second\n");
  expect(lyrics.synchronized).toEqual([
    { timeMs: 1000, text: "First" },
    { timeMs: 2500, text: "Second" },
  ]);
});

it("supports millisecond-precision timestamps", () => {
  const lyrics = parseLrc("[00:01.123]Line\n");
  expect(lyrics.synchronized?.[0]?.timeMs).toBe(1123);
});

it("expands repeated timestamp prefixes onto duplicate lines", () => {
  const lyrics = parseLrc("[00:01.00][00:05.00]Repeat me\n");
  expect(lyrics.synchronized).toEqual([
    { timeMs: 1000, text: "Repeat me" },
    { timeMs: 5000, text: "Repeat me" },
  ]);
});

it("captures language ID tags", () => {
  const lyrics = parseLrc("[la:eng]\n[ar:Artist]\n[00:00.00]Hello\n");
  expect(lyrics.language).toBe("eng");
});

it("captures the title ID tag as the description", () => {
  const lyrics = parseLrc("[ti:Lyrics]\n[00:00.00]Hello\n");
  expect(lyrics.description).toBe("Lyrics");
});

it("sorts synchronized lyrics by timestamp", () => {
  const lyrics = parseLrc("[00:05.00]Late\n[00:01.00]Early\n");
  expect(lyrics.synchronized?.map((line) => line.timeMs)).toEqual([1000, 5000]);
});

it("falls through to unsynchronized when no timestamps parse", () => {
  const lyrics = parseLrc("Plain text without timestamps");
  expect(lyrics.synchronized).toBeUndefined();
  expect(lyrics.unsynchronized).toBe("Plain text without timestamps");
});

describe("round-trip with formatLrc", () => {
  it("re-parses to the same synchronized lines", () => {
    const original = parseLrc("[la:eng]\n[ti:Lyrics]\n\n[00:01.50]One\n[00:03.25]Two\n");
    const re = parseLrc(formatLrc(original));
    expect(re.synchronized).toEqual(original.synchronized);
    expect(re.language).toBe(original.language);
    expect(re.description).toBe(original.description);
  });
});
