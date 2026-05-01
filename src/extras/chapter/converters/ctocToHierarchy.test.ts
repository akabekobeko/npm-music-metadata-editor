import { describe, expect, it } from "vitest";
import type { ChapterInfo } from "../../../types.js";
import { buildCtoc } from "./buildCtoc.js";
import { buildChapterHierarchy, decodeCtoc } from "./ctocToHierarchy.js";

const chapter = (id: string): ChapterInfo => ({ id, startMs: 0, endMs: 1000 });

describe("decodeCtoc", () => {
  it("round-trips through buildCtoc", () => {
    const frame = buildCtoc({
      id: "toc",
      childElementIds: ["a", "b", "c"],
      isTopLevel: true,
      ordered: true,
      description: "Main",
      majorVersion: 4,
    });
    const decoded = decodeCtoc({ body: frame.data, majorVersion: 4 });
    expect(decoded).toEqual({
      id: "toc",
      isTopLevel: true,
      ordered: true,
      childElementIds: ["a", "b", "c"],
      description: "Main",
    });
  });
});

describe("buildChapterHierarchy", () => {
  it("returns chapters as a flat list when no CTOC entries are present", () => {
    expect(buildChapterHierarchy({ chapters: [chapter("a"), chapter("b")], ctocs: [] })).toEqual([
      chapter("a"),
      chapter("b"),
    ]);
  });

  it("uses the top-level CTOC to order chapters", () => {
    const result = buildChapterHierarchy({
      chapters: [chapter("c"), chapter("a"), chapter("b")],
      ctocs: [
        {
          id: "toc",
          isTopLevel: true,
          ordered: true,
          childElementIds: ["a", "b", "c"],
        },
      ],
    });
    expect(result.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });

  it("appends chapters that no CTOC referenced", () => {
    const result = buildChapterHierarchy({
      chapters: [chapter("a"), chapter("b"), chapter("orphan")],
      ctocs: [
        {
          id: "toc",
          isTopLevel: true,
          ordered: true,
          childElementIds: ["a", "b"],
        },
      ],
    });
    expect(result.map((c) => c.id)).toEqual(["a", "b", "orphan"]);
  });

  it("breaks cycles between CTOC entries", () => {
    const result = buildChapterHierarchy({
      chapters: [chapter("a")],
      ctocs: [
        { id: "toc1", isTopLevel: true, ordered: true, childElementIds: ["toc2"] },
        { id: "toc2", isTopLevel: false, ordered: true, childElementIds: ["toc1", "a"] },
      ],
    });
    expect(result.map((c) => c.id)).toEqual(["a"]);
  });
});
