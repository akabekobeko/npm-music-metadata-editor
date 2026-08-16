import { expect, it } from "vitest";
import { resolveGnreIndex } from "./resolveGnreIndex.js";

it("resolves a 1-based index to the ID3v1 genre name", () => {
  expect(resolveGnreIndex(18)).toBe("Rock");
});

it("resolves the first table entry", () => {
  expect(resolveGnreIndex(1)).toBe("Blues");
});

it("resolves Winamp extension entries beyond the original 80", () => {
  expect(resolveGnreIndex(148)).toBe("Synthpop");
});

it("returns undefined for index 0", () => {
  expect(resolveGnreIndex(0)).toBeUndefined();
});

it("returns undefined for an out-of-range index", () => {
  expect(resolveGnreIndex(149)).toBeUndefined();
});
