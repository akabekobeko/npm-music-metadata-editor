import { expect, it } from "vitest";
import { applyTagPatch } from "./applyTagPatch.js";

it("preserves existing fields the patch leaves undefined", () => {
  const result = applyTagPatch({
    existing: { title: "Old", bpm: 128 },
    patch: { title: "New", bpm: undefined },
  });
  expect(result).toEqual({ title: "New", bpm: 128 });
});

it("removes fields set to null or the empty string", () => {
  const result = applyTagPatch({
    existing: { title: "Old", album: "Album", bpm: 128, year: 2020 },
    patch: { title: "", bpm: null, year: null },
  });
  expect(result).toEqual({ album: "Album" });
  expect("bpm" in result).toBe(false);
});

it("does not mutate either input", () => {
  const existing = { title: "Old", bpm: 128 };
  const patch = { bpm: null };
  applyTagPatch({ existing, patch });
  expect(existing).toEqual({ title: "Old", bpm: 128 });
  expect(patch).toEqual({ bpm: null });
});

it("returns a copy of existing when the patch is empty", () => {
  const existing = { title: "Old" };
  const result = applyTagPatch({ existing, patch: {} });
  expect(result).toEqual(existing);
  expect(result).not.toBe(existing);
});
