import { expect, it } from "vitest";
import type { ItunesAtom, ItunesDataValue } from "../types.js";
import { mergeIlstAtoms } from "./mergeIlstAtoms.js";

const value = (byte: number): ItunesDataValue => ({
  typeIndicator: 1,
  locale: 0,
  data: Uint8Array.of(byte),
});

const existing: readonly ItunesAtom[] = [
  { name: "©nam", values: [value(1)] },
  { name: "tmpo", values: [value(2)] },
  { name: "----", meanNamespace: "com.apple.iTunes", meanName: "LYRICIST", values: [value(3)] },
  { name: "xxxx", values: [value(4)] },
];

it("replaces atoms owned by the incoming list and appends new ones", () => {
  const merged = mergeIlstAtoms(existing, [
    { name: "©nam", values: [value(9)] },
    { name: "©alb", values: [value(8)] },
  ]);
  expect(merged.map((a) => a.name)).toEqual(["tmpo", "----", "xxxx", "©nam", "©alb"]);
  expect(merged.find((a) => a.name === "©nam")?.values[0]?.data[0]).toBe(9);
});

it("drops the existing atom for a tombstone without emitting the tombstone", () => {
  const merged = mergeIlstAtoms(existing, [{ name: "tmpo", values: [] }]);
  expect(merged.map((a) => a.name)).toEqual(["©nam", "----", "xxxx"]);
});

it("matches freeform tombstones by (namespace, name)", () => {
  const merged = mergeIlstAtoms(existing, [
    { name: "----", meanNamespace: "com.apple.iTunes", meanName: "LYRICIST", values: [] },
  ]);
  expect(merged.map((a) => a.name)).toEqual(["©nam", "tmpo", "xxxx"]);
});

it("leaves unrelated atoms untouched when the tombstone has no match", () => {
  const merged = mergeIlstAtoms(existing, [{ name: "rtng", values: [] }]);
  expect(merged).toEqual(existing);
});
