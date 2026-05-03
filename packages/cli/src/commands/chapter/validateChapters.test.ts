import type { ChapterInfo } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { validateChapters } from "./validateChapters.js";

type ChArgs = {
  readonly id: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly title?: string;
};

const ch = ({ id, startMs, endMs, title }: ChArgs): ChapterInfo => ({
  id,
  startMs,
  endMs,
  ...(title === undefined ? {} : { title }),
});

describe("validateChapters", () => {
  it("accepts an empty array", () => {
    expect(() => validateChapters([])).not.toThrow();
  });

  it("accepts a strictly-increasing well-formed list", () => {
    expect(() =>
      validateChapters([
        ch({ id: "ch1", startMs: 0, endMs: 1000, title: "A" }),
        ch({ id: "ch2", startMs: 1000, endMs: 2000, title: "B" }),
      ]),
    ).not.toThrow();
  });

  it("rejects endMs <= startMs", () => {
    expect(() => validateChapters([ch({ id: "ch1", startMs: 100, endMs: 100 })])).toThrow(
      CommanderError,
    );
    expect(() => validateChapters([ch({ id: "ch1", startMs: 200, endMs: 100 })])).toThrow(
      CommanderError,
    );
  });

  it("rejects equal startMs values (strict monotonic increase)", () => {
    expect(() =>
      validateChapters([
        ch({ id: "a", startMs: 0, endMs: 500 }),
        ch({ id: "b", startMs: 0, endMs: 1000 }),
      ]),
    ).toThrow(/must be greater than the previous/);
  });

  it("rejects out-of-order startMs", () => {
    expect(() =>
      validateChapters([
        ch({ id: "a", startMs: 1000, endMs: 2000 }),
        ch({ id: "b", startMs: 500, endMs: 1500 }),
      ]),
    ).toThrow(CommanderError);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      validateChapters([
        ch({ id: "dup", startMs: 0, endMs: 500 }),
        ch({ id: "dup", startMs: 500, endMs: 1000 }),
      ]),
    ).toThrow(/duplicate "id"/);
  });

  it("rejects empty id", () => {
    expect(() => validateChapters([ch({ id: "", startMs: 0, endMs: 500 })])).toThrow(
      /non-empty string/,
    );
  });

  it("rejects non-finite startMs", () => {
    expect(() => validateChapters([ch({ id: "a", startMs: Number.NaN, endMs: 500 })])).toThrow(
      /finite number/,
    );
  });
});
