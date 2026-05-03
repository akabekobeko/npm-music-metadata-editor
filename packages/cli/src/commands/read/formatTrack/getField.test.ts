import type { Track } from "@akabeko/music-metadata-editor";
import { expect, it } from "vitest";
import { getField } from "./getField.js";

const baseTrack = (): Track => ({
  audioFormat: "mp3",
  durationMs: 12345,
  tag: { title: "Hello", artist: "World", trackNumber: 3, trackTotal: 12 },
  pictures: [
    {
      mimeType: "image/jpeg",
      kind: 3,
      description: "front",
      data: new Uint8Array([1, 2, 3]),
    },
  ],
  chapters: [],
  additionalFields: { CUSTOM: "value" },
  warnings: [],
});

it("resolves a top-level field by exact name", () => {
  const result = getField(baseTrack(), "audioFormat");
  expect(result).toEqual({ found: true, value: "mp3" });
});

it("treats unknown leading segments as `tag.` shortcuts", () => {
  const result = getField(baseTrack(), "title");
  expect(result).toEqual({ found: true, value: "Hello" });
});

it("accepts an explicit `tag.` prefix", () => {
  const result = getField(baseTrack(), "tag.artist");
  expect(result).toEqual({ found: true, value: "World" });
});

it("returns the raw value for whole-section access", () => {
  const result = getField(baseTrack(), "tag");
  expect(result.found).toBe(true);
  if (result.found) {
    expect((result.value as { title: string }).title).toBe("Hello");
  }
});

it("indexes into arrays via numeric path segments", () => {
  const result = getField(baseTrack(), "pictures.0.kind");
  expect(result).toEqual({ found: true, value: 3 });
});

it("reports missing fields as not found", () => {
  expect(getField(baseTrack(), "tag.nonexistent")).toEqual({ found: false });
  expect(getField(baseTrack(), "nonexistent")).toEqual({ found: false });
  expect(getField(baseTrack(), "pictures.99.kind")).toEqual({ found: false });
});

it("treats empty / dot-only paths as not found", () => {
  expect(getField(baseTrack(), "")).toEqual({ found: false });
  expect(getField(baseTrack(), ".")).toEqual({ found: false });
  expect(getField(baseTrack(), "...")).toEqual({ found: false });
});

it("refuses to walk through prototype-related keys", () => {
  expect(getField(baseTrack(), "__proto__.toString")).toEqual({ found: false });
  expect(getField(baseTrack(), "constructor.name")).toEqual({ found: false });
  expect(getField(baseTrack(), "tag.__proto__.toString")).toEqual({ found: false });
});

it("accesses additionalFields entries by key", () => {
  const result = getField(baseTrack(), "additionalFields.CUSTOM");
  expect(result).toEqual({ found: true, value: "value" });
});
