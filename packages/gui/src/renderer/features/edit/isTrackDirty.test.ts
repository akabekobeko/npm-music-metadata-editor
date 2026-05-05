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

it("returns true when a picture is added", () => {
  const origin = baseTrack();
  const track: Track = {
    ...origin,
    pictures: [{ mimeType: "image/jpeg", kind: 3, data: new Uint8Array(4) }],
  };
  expect(isTrackDirty(track, origin)).toBe(true);
});

it("returns false when picture descriptors match", () => {
  const picture = { mimeType: "image/jpeg" as const, kind: 3 as const, data: new Uint8Array(4) };
  const origin: Track = { ...baseTrack(), pictures: [picture] };
  const track: Track = {
    ...origin,
    pictures: [{ mimeType: "image/jpeg", kind: 3, data: new Uint8Array(4) }],
  };
  expect(isTrackDirty(track, origin)).toBe(false);
});

it("returns true when lyrics differ", () => {
  const origin = baseTrack();
  const track: Track = { ...origin, lyrics: { unsynchronized: "Hi" } };
  expect(isTrackDirty(track, origin)).toBe(true);
});

it("treats undefined lyrics and an empty LyricsInfo as equal", () => {
  const origin = baseTrack();
  const track: Track = { ...origin, lyrics: {} };
  expect(isTrackDirty(track, origin)).toBe(false);
});
