import { expect, it } from "vitest";
import { formatLrc } from "./formatLrc.js";
import { parseLrc } from "./parseLrc.js";

it("formats a single line with millisecond precision", () => {
  const text = formatLrc([{ timeMs: 12_300, text: "Foo" }]);

  expect(text).toBe("[00:12.300]Foo\n");
});

it("emits metadata tags before lyric lines, sorted by key", () => {
  const text = formatLrc([{ timeMs: 0, text: "Hi" }], { ti: "Title", ar: "Artist" });

  expect(text).toBe("[ar:Artist]\n[ti:Title]\n[00:00.000]Hi\n");
});

it("sorts lines by timeMs ascending on output", () => {
  const text = formatLrc([
    { timeMs: 30_000, text: "B" },
    { timeMs: 10_000, text: "A" },
  ]);

  expect(text).toBe("[00:10.000]A\n[00:30.000]B\n");
});

it("clamps negative offsets to zero", () => {
  const text = formatLrc([{ timeMs: -500, text: "Pre" }]);

  expect(text).toBe("[00:00.000]Pre\n");
});

it("round-trips through parseLrc", () => {
  const lines = [
    { timeMs: 0, text: "Intro" },
    { timeMs: 12_300, text: "Foo bar" },
    { timeMs: 3_600_000, text: "Long" },
  ];
  const restored = parseLrc(formatLrc(lines)).lines;

  expect(restored).toEqual(lines);
});

it("skips empty metadata values", () => {
  const text = formatLrc([{ timeMs: 0, text: "Hi" }], { ti: "", ar: "Artist" });

  expect(text).toBe("[ar:Artist]\n[00:00.000]Hi\n");
});
