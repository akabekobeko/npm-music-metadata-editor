import { expect, it } from "vitest";
import { fillNumberPairs } from "./fillNumberPairs.js";

const existing = { trackNumber: 2, trackTotal: 10, discNumber: 1, discTotal: 2 };

it("copies the untouched half when only the total is cleared", () => {
  expect(fillNumberPairs({ patch: { trackTotal: null }, existing })).toEqual({
    trackNumber: 2,
    trackTotal: null,
  });
});

it("copies the untouched half when only the number is set", () => {
  expect(fillNumberPairs({ patch: { discNumber: 3 }, existing })).toEqual({
    discNumber: 3,
    discTotal: 2,
  });
});

it("leaves fully specified or fully untouched pairs alone", () => {
  expect(fillNumberPairs({ patch: { trackNumber: 5, trackTotal: null }, existing })).toEqual({
    trackNumber: 5,
    trackTotal: null,
  });
  expect(fillNumberPairs({ patch: { title: "x" }, existing })).toEqual({ title: "x" });
});

it("does not invent a value when the existing tag lacks the other half", () => {
  expect(fillNumberPairs({ patch: { trackTotal: 12 }, existing: {} })).toEqual({
    trackTotal: 12,
  });
});

it("does not mutate the patch", () => {
  const patch = { trackTotal: null };
  fillNumberPairs({ patch, existing });
  expect(patch).toEqual({ trackTotal: null });
});
