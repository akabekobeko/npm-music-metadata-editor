import type { Track } from "@mme/ipc";
import { expect, it } from "vitest";
import { mergeRowsByPath } from "./mergeRowsByPath";
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

const row = (filePath: string, title: string): TrackRow => {
  const track = fakeTrack(title);
  return { filePath, track, origin: track, dirty: false };
};

it("appends incoming rows that are not already present", () => {
  const merged = mergeRowsByPath([row("/a.mp3", "A")], [row("/b.mp3", "B")]);
  expect(merged.map((r) => r.filePath)).toEqual(["/a.mp3", "/b.mp3"]);
});

it("replaces existing rows with the incoming copy when paths collide", () => {
  const merged = mergeRowsByPath([row("/a.mp3", "Old")], [row("/a.mp3", "New")]);
  expect(merged).toHaveLength(1);
  expect(merged[0]?.track.tag.title).toBe("New");
});

it("preserves existing rows that are not in the incoming batch", () => {
  const merged = mergeRowsByPath([row("/a.mp3", "A"), row("/b.mp3", "B")], [row("/b.mp3", "B2")]);
  expect(merged.map((r) => r.filePath)).toEqual(["/a.mp3", "/b.mp3"]);
  expect(merged[1]?.track.tag.title).toBe("B2");
});

it("returns just the incoming rows when existing is empty", () => {
  const merged = mergeRowsByPath([], [row("/a.mp3", "A"), row("/b.mp3", "B")]);
  expect(merged.map((r) => r.filePath)).toEqual(["/a.mp3", "/b.mp3"]);
});

it("returns the existing snapshot unchanged when incoming is empty", () => {
  const merged = mergeRowsByPath([row("/a.mp3", "A")], []);
  expect(merged.map((r) => r.filePath)).toEqual(["/a.mp3"]);
});
