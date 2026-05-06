import { expect, it } from "vitest";
import type { Track } from "../../../main/ipc/types.js";
import type { TrackRow } from "../tracks/types.js";
import { editReducer, initialEditState } from "./store";

const buildRow = (filePath: string, title: string): TrackRow => {
  const track: Track = {
    audioFormat: "mp3",
    durationMs: 1000,
    tag: { title },
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [],
  };
  return { filePath, track, origin: track, dirty: false };
};

it("loads rows and clears history", () => {
  const stateAfterEdit = editReducer(
    { rows: [buildRow("/a.mp3", "A")], history: [[buildRow("/a.mp3", "Stale")]] },
    { type: "load", rows: [buildRow("/b.mp3", "B")] },
  );
  expect(stateAfterEdit.rows.map((row) => row.filePath)).toEqual(["/b.mp3"]);
  expect(stateAfterEdit.history).toEqual([]);
});

it("commit flips dirty to true and pushes the prior rows to history", () => {
  const loaded = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "Old")],
  });
  const next = editReducer(loaded, {
    type: "commit",
    filePath: "/a.mp3",
    field: "title",
    value: "New",
  });
  expect(next.rows[0]?.track.tag.title).toBe("New");
  expect(next.rows[0]?.dirty).toBe(true);
  expect(next.history).toHaveLength(1);
  expect(next.history[0]?.[0]?.track.tag.title).toBe("Old");
});

it("commit with the original value yields dirty: false (origin compare wins)", () => {
  const loaded = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "Same")],
  });
  const dirty = editReducer(loaded, {
    type: "commit",
    filePath: "/a.mp3",
    field: "title",
    value: "Changed",
  });
  const reverted = editReducer(dirty, {
    type: "commit",
    filePath: "/a.mp3",
    field: "title",
    value: "Same",
  });
  expect(reverted.rows[0]?.dirty).toBe(false);
});

it("undo pops the most recent history entry", () => {
  const loaded = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "Old")],
  });
  const dirty = editReducer(loaded, {
    type: "commit",
    filePath: "/a.mp3",
    field: "title",
    value: "New",
  });
  const undone = editReducer(dirty, { type: "undo" });
  expect(undone.rows[0]?.track.tag.title).toBe("Old");
  expect(undone.history).toEqual([]);
});

it("undo on empty history is a no-op", () => {
  const loaded = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "A")],
  });
  expect(editReducer(loaded, { type: "undo" })).toBe(loaded);
});

it("revert resets the row's track to origin", () => {
  const loaded = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "Original")],
  });
  const dirty = editReducer(loaded, {
    type: "commit",
    filePath: "/a.mp3",
    field: "title",
    value: "Changed",
  });
  const reverted = editReducer(dirty, { type: "revert", filePath: "/a.mp3" });
  expect(reverted.rows[0]?.track.tag.title).toBe("Original");
  expect(reverted.rows[0]?.dirty).toBe(false);
});

it("applyChange installs precomputed rows and pushes history (paste path)", () => {
  const loaded = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "A"), buildRow("/b.mp3", "B")],
  });
  const pasted: readonly TrackRow[] = [buildRow("/a.mp3", "X"), buildRow("/b.mp3", "Y")];
  const next = editReducer(loaded, { type: "applyChange", nextRows: pasted });
  expect(next.rows.map((row) => row.track.tag.title)).toEqual(["X", "Y"]);
  expect(next.history).toHaveLength(1);
});

it("history is bounded to 50 entries (oldest is dropped)", () => {
  let state = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "0")],
  });
  for (let i = 1; i <= 60; i++) {
    state = editReducer(state, {
      type: "commit",
      filePath: "/a.mp3",
      field: "title",
      value: String(i),
    });
  }

  expect(state.history).toHaveLength(50);
  expect(state.rows[0]?.track.tag.title).toBe("60");
});

it("markSaveErrors attaches errors per filePath without altering history", () => {
  const loaded = editReducer(initialEditState, {
    type: "load",
    rows: [buildRow("/a.mp3", "A"), buildRow("/b.mp3", "B")],
  });
  const errors = new Map<string, { name: string; message: string } | undefined>([
    ["/a.mp3", { name: "MmeError", message: "boom" }],
    ["/b.mp3", undefined],
  ]);
  const next = editReducer(loaded, { type: "markSaveErrors", errors });

  expect(next.rows[0]?.saveError?.message).toBe("boom");
  expect(next.rows[1]?.saveError).toBeUndefined();
  expect(next.history).toEqual([]);
});
