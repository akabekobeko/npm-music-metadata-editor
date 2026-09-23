import { expect, it } from "vitest";
import { vorbisCommentToTagData } from "./vorbisCommentToTagData.js";

const commentOf = (...pairs: [string, string][]) => ({
  vendor: "test",
  comments: pairs.map(([key, value]) => ({ key, value })),
});

it("decodes RATING on the 0..100 scale", () => {
  expect(vorbisCommentToTagData(commentOf(["RATING", "70"])).rating).toBeCloseTo(0.7, 10);
});

it("decodes RATING on the 0..5 star scale, case-insensitively", () => {
  expect(vorbisCommentToTagData(commentOf(["rating", "2.5"])).rating).toBeCloseTo(0.5, 10);
  expect(vorbisCommentToTagData(commentOf(["Rating", "5"])).rating).toBe(1);
});

it("keeps the first RATING and ignores non-numeric values", () => {
  expect(vorbisCommentToTagData(commentOf(["RATING", "40"], ["RATING", "80"])).rating).toBeCloseTo(
    0.4,
    10,
  );
  expect(vorbisCommentToTagData(commentOf(["RATING", "n/a"])).rating).toBeUndefined();
});
