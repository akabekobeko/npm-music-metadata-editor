import { expect, it } from "vitest";
import type { Track } from "../../../main/ipc/types.js";
import type { TrackRow } from "../tracks/types.js";
import { setTagValue } from "./setTagValue";

const buildRow = (title: string): TrackRow => {
  const track: Track = {
    audioFormat: "mp3",
    durationMs: 1000,
    tag: { title },
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [],
  };
  return { filePath: "/a.mp3", track, origin: track, dirty: false };
};

it("sets a tag value and flips `dirty` to true", () => {
  const row = buildRow("Old");
  const next = setTagValue({ row, field: "title", value: "New" });
  expect(next.track.tag.title).toBe("New");
  expect(next.dirty).toBe(true);
  expect(row.track.tag.title).toBe("Old");
});

it("removes the field when value is undefined", () => {
  const row = buildRow("Old");
  const next = setTagValue({ row, field: "title", value: undefined });
  expect("title" in next.track.tag).toBe(false);
  expect(next.dirty).toBe(true);
});

it("returns a row matching origin (dirty: false) when the value reverts", () => {
  const row = buildRow("Same");
  const next = setTagValue({ row, field: "title", value: "Same" });
  expect(next.dirty).toBe(false);
});
