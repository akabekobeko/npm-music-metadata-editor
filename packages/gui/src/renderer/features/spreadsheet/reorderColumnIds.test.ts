import { expect, it } from "vitest";

import { reorderColumnIds } from "./reorderColumnIds";
import type { ColumnId } from "./types";

const base: readonly ColumnId[] = ["fileName", "tag.title", "tag.artist", "tag.album"];

it("moves the source after the target when side is 'after'", () => {
  const next = reorderColumnIds({
    ids: base,
    sourceId: "tag.title",
    targetId: "tag.album",
    side: "after",
  });
  expect(next).toEqual(["fileName", "tag.artist", "tag.album", "tag.title"]);
});

it("moves the source before the target when side is 'before'", () => {
  const next = reorderColumnIds({
    ids: base,
    sourceId: "tag.album",
    targetId: "tag.title",
    side: "before",
  });
  expect(next).toEqual(["fileName", "tag.album", "tag.title", "tag.artist"]);
});

it("returns the same tuple when source equals target", () => {
  const next = reorderColumnIds({
    ids: base,
    sourceId: "tag.title",
    targetId: "tag.title",
    side: "before",
  });
  expect(next).toBe(base);
});

it("returns the same tuple when the target is unknown", () => {
  const next = reorderColumnIds({
    ids: base,
    sourceId: "tag.title",
    targetId: "tag.genre",
    side: "after",
  });
  expect(next).toBe(base);
});

it("returns the same tuple when re-inserting at the original position", () => {
  // Dragging tag.title before tag.artist leaves order unchanged.
  const next = reorderColumnIds({
    ids: base,
    sourceId: "tag.title",
    targetId: "tag.artist",
    side: "before",
  });
  expect(next).toBe(base);
});

it("supports moving a column to the very front", () => {
  const next = reorderColumnIds({
    ids: base,
    sourceId: "tag.album",
    targetId: "fileName",
    side: "before",
  });
  expect(next).toEqual(["tag.album", "fileName", "tag.title", "tag.artist"]);
});
