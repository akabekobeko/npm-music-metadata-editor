import { expect, it } from "vitest";
import type { Track } from "../../../main/ipc/types.js";
import { initialTracksState, tracksReducer } from "./store";
import type { TrackRow } from "./types.js";

const fakeTrack = (title: string): Track => ({
  audioFormat: "mp3",
  durationMs: 1000,
  tag: { title },
  pictures: [],
  chapters: [],
  additionalFields: {},
  warnings: [],
});

const row = (filePath: string, title: string): TrackRow => ({
  filePath,
  track: fakeTrack(title),
  dirty: false,
});

it("flips `loading` to true on load:start", () => {
  const next = tracksReducer(initialTracksState, { type: "load:start" });
  expect(next.loading).toBe(true);
});

it("appends rows on load:done while preserving prior rows", () => {
  const first = tracksReducer(initialTracksState, {
    type: "load:done",
    payload: { rows: [row("/a.mp3", "A")], errors: [] },
  });
  const second = tracksReducer(first, {
    type: "load:done",
    payload: { rows: [row("/b.mp3", "B")], errors: [] },
  });
  expect(second.rows.map((r) => r.filePath)).toEqual(["/a.mp3", "/b.mp3"]);
  expect(second.loading).toBe(false);
});

it("re-loading the same file replaces the previous row (last-write-wins)", () => {
  const first = tracksReducer(initialTracksState, {
    type: "load:done",
    payload: { rows: [row("/a.mp3", "Old")], errors: [] },
  });
  const second = tracksReducer(first, {
    type: "load:done",
    payload: { rows: [row("/a.mp3", "New")], errors: [] },
  });
  expect(second.rows).toHaveLength(1);
  expect(second.rows[0]?.track.tag.title).toBe("New");
});

it("clears the error of a path that subsequently loads successfully", () => {
  const errorState = tracksReducer(initialTracksState, {
    type: "load:done",
    payload: {
      rows: [],
      errors: [{ filePath: "/a.mp3", error: { name: "Error", message: "bad" } }],
    },
  });
  const recovered = tracksReducer(errorState, {
    type: "load:done",
    payload: { rows: [row("/a.mp3", "Recovered")], errors: [] },
  });
  expect(recovered.errors).toEqual([]);
  expect(recovered.rows).toHaveLength(1);
});

it("resets state on `clear`", () => {
  const populated = tracksReducer(initialTracksState, {
    type: "load:done",
    payload: { rows: [row("/a.mp3", "A")], errors: [] },
  });
  expect(tracksReducer(populated, { type: "clear" })).toEqual(initialTracksState);
});
