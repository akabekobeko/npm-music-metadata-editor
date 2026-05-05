import { expect, it } from "vitest";
import type { PictureInfo } from "../../../main/ipc/types.js";
import { summarizePictures } from "./summarizePictures";

const fakePicture = (kind: number): PictureInfo => ({
  mimeType: "image/png",
  kind: kind as PictureInfo["kind"],
  data: new Uint8Array([0]),
});

it("returns an empty summary for no pictures", () => {
  expect(summarizePictures([])).toEqual({ count: 0, hasCoverFront: false, label: undefined });
});

it("reports the count and `cover` hint when a Cover (front) picture is present", () => {
  const summary = summarizePictures([fakePicture(3), fakePicture(4)]);
  expect(summary.count).toBe(2);
  expect(summary.hasCoverFront).toBe(true);
  expect(summary.label).toBe("2 (cover)");
});

it("omits the `cover` hint when no picture has kind 3", () => {
  const summary = summarizePictures([fakePicture(0), fakePicture(7)]);
  expect(summary.hasCoverFront).toBe(false);
  expect(summary.label).toBe("2");
});
