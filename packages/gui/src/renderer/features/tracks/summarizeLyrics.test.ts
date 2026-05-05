import { expect, it } from "vitest";
import { summarizeLyrics } from "./summarizeLyrics";

it("returns `none` when lyrics are undefined", () => {
  expect(summarizeLyrics(undefined)).toEqual({ kind: "none", label: undefined });
});

it("returns `none` when both unsynchronized and synchronized are empty", () => {
  expect(summarizeLyrics({ unsynchronized: "", synchronized: [] })).toEqual({
    kind: "none",
    label: undefined,
  });
});

it("returns `text` when only plain lyrics are present", () => {
  expect(summarizeLyrics({ unsynchronized: "hello" })).toEqual({ kind: "text", label: "text" });
});

it("returns `synced` when synchronized lines are present", () => {
  const summary = summarizeLyrics({ synchronized: [{ timeMs: 0, text: "hi" }] });
  expect(summary).toEqual({ kind: "synced", label: "synced" });
});

it("prefers `synced` when both forms coexist", () => {
  const summary = summarizeLyrics({
    unsynchronized: "hello",
    synchronized: [{ timeMs: 0, text: "hi" }],
  });
  expect(summary.kind).toBe("synced");
});
