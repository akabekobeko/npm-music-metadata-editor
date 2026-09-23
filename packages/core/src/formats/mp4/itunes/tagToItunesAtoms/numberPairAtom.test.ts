import { expect, it } from "vitest";
import { numberPairAtom } from "./numberPairAtom.js";

it("returns undefined when neither half was provided", () => {
  expect(
    numberPairAtom({ name: "trkn", number: undefined, total: undefined, trailingPad: true }),
  ).toBeUndefined();
});

it("returns a tombstone when every provided half is cleared", () => {
  expect(numberPairAtom({ name: "trkn", number: null, total: null, trailingPad: true })).toEqual({
    name: "trkn",
    values: [],
  });
  expect(
    numberPairAtom({ name: "disk", number: null, total: undefined, trailingPad: false }),
  ).toEqual({ name: "disk", values: [] });
});

it("writes cleared or missing halves as 0 when the other half has a value", () => {
  const atom = numberPairAtom({ name: "trkn", number: null, total: 12, trailingPad: true });
  const data = atom?.values[0]?.data;
  expect(data).toBeDefined();
  // 2-byte pad + number (0) + total (12) + 2-byte trailing pad.
  expect(Array.from(data ?? [])).toEqual([0, 0, 0, 0, 0, 12, 0, 0]);
});
