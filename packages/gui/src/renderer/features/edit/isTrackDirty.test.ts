import { expect, it } from "vitest";
import type { Track } from "../../../main/ipc/types.js";
import { isTrackDirty } from "./isTrackDirty";

const baseTrack = (): Track => ({
  audioFormat: "mp3",
  durationMs: 1000,
  tag: { title: "Hello", year: 2024 },
  pictures: [],
  chapters: [],
  additionalFields: {},
  warnings: [],
});

it("returns false when origin and track share identical tag values", () => {
  const origin = baseTrack();
  const track: Track = { ...origin, tag: { ...origin.tag } };
  expect(isTrackDirty(track, origin)).toBe(false);
});

it("returns true when a tag value changes", () => {
  const origin = baseTrack();
  const track: Track = { ...origin, tag: { ...origin.tag, title: "Goodbye" } };
  expect(isTrackDirty(track, origin)).toBe(true);
});

it("returns true when a tag is removed", () => {
  const origin = baseTrack();
  const track: Track = { ...origin, tag: { title: origin.tag.title } };
  expect(isTrackDirty(track, origin)).toBe(true);
});

it("returns true when a tag is added", () => {
  const origin = baseTrack();
  const track: Track = { ...origin, tag: { ...origin.tag, artist: "New" } };
  expect(isTrackDirty(track, origin)).toBe(true);
});
