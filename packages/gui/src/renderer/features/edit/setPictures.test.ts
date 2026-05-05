import { expect, it } from "vitest";
import type { PictureInfo, Track } from "../../../main/ipc/types.js";
import type { TrackRow } from "../tracks/types.js";
import { setPictures } from "./setPictures.js";

const buildPicture = (description: string, byteLength = 4): PictureInfo => ({
  mimeType: "image/jpeg",
  kind: 3,
  description,
  data: new Uint8Array(byteLength),
});

const buildRow = (pictures: readonly PictureInfo[]): TrackRow => {
  const track: Track = {
    audioFormat: "mp3",
    durationMs: 1000,
    tag: {},
    pictures,
    chapters: [],
    additionalFields: {},
    warnings: [],
  };
  return { filePath: "/a.mp3", track, origin: track, dirty: false };
};

it("replaces the picture list and flips dirty when adding a picture", () => {
  const row = buildRow([]);
  const next = setPictures({ row, pictures: [buildPicture("Front")] });
  expect(next.track.pictures).toHaveLength(1);
  expect(next.dirty).toBe(true);
});

it("returns dirty: false when the replacement matches the origin", () => {
  const original = buildPicture("Front");
  const row = buildRow([original]);
  const next = setPictures({ row, pictures: [buildPicture("Front")] });
  expect(next.dirty).toBe(false);
});

it("flips dirty when the byte length differs", () => {
  const row = buildRow([buildPicture("Front", 4)]);
  const next = setPictures({ row, pictures: [buildPicture("Front", 8)] });
  expect(next.dirty).toBe(true);
});
