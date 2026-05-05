import { expect, it } from "vitest";
import type { LyricsInfo, Track } from "../../../main/ipc/types.js";
import type { TrackRow } from "../tracks/types.js";
import { setLyrics } from "./setLyrics.js";

const buildRow = (lyrics?: LyricsInfo): TrackRow => {
  const track: Track = {
    audioFormat: "mp3",
    durationMs: 1000,
    tag: {},
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [],
    ...(lyrics === undefined ? {} : { lyrics }),
  };
  return { filePath: "/a.mp3", track, origin: track, dirty: false };
};

it("assigns lyrics and flips dirty", () => {
  const row = buildRow();
  const next = setLyrics({ row, lyrics: { unsynchronized: "Hi" } });
  expect(next.track.lyrics).toEqual({ unsynchronized: "Hi" });
  expect(next.dirty).toBe(true);
});

it("removes lyrics when value is undefined", () => {
  const row = buildRow({ unsynchronized: "Hi" });
  const next = setLyrics({ row, lyrics: undefined });
  expect("lyrics" in next.track).toBe(false);
  expect(next.dirty).toBe(true);
});

it("returns dirty: false when the replacement matches the origin", () => {
  const row = buildRow({ unsynchronized: "Hi" });
  const next = setLyrics({ row, lyrics: { unsynchronized: "Hi" } });
  expect(next.dirty).toBe(false);
});
