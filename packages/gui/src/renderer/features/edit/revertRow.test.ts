import { expect, it } from "vitest";
import type { Track } from "../../../main/ipc/types.js";
import type { TrackRow } from "../tracks/types.js";
import { revertRow } from "./revertRow";

const buildRow = (): TrackRow => {
  const origin: Track = {
    audioFormat: "mp3",
    durationMs: 1000,
    tag: { title: "Original" },
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [],
  };
  const track: Track = { ...origin, tag: { ...origin.tag, title: "Edited" } };
  return { filePath: "/a.mp3", track, origin, dirty: true };
};

it("restores `track` to the origin snapshot and clears dirty", () => {
  const row = buildRow();
  const reverted = revertRow(row);
  expect(reverted.track).toBe(row.origin);
  expect(reverted.dirty).toBe(false);
});
