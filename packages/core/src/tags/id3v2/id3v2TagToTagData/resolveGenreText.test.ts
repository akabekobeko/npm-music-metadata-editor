import { expect, it } from "vitest";
import { resolveGenreText } from "./resolveGenreText.js";

it("resolves a parenthesized ID3v1 genre reference", () => {
  expect(resolveGenreText("(17)")).toBe("Rock");
});

it("resolves a bare ID3v2.4-style numeric code", () => {
  expect(resolveGenreText("17")).toBe("Rock");
});

it("resolves the highest table entry", () => {
  expect(resolveGenreText("(147)")).toBe("Synthpop");
});

it("prefers the refinement over the referenced genre", () => {
  expect(resolveGenreText("(17)Progressive Rock")).toBe("Progressive Rock");
});

it("joins multiple references with a slash", () => {
  expect(resolveGenreText("(17)(6)")).toBe("Rock/Grunge");
});

it("resolves the special remix and cover codes", () => {
  expect(resolveGenreText("(RX)")).toBe("Remix");
  expect(resolveGenreText("(CR)")).toBe("Cover");
  expect(resolveGenreText("RX")).toBe("Remix");
  expect(resolveGenreText("CR")).toBe("Cover");
});

it("unescapes a leading double parenthesis into a literal value", () => {
  expect(resolveGenreText("((custom)")).toBe("(custom)");
});

it("unescapes an escaped refinement after a reference", () => {
  expect(resolveGenreText("(17)((I can be your hero)")).toBe("(I can be your hero)");
});

it("keeps an out-of-range reference unchanged", () => {
  expect(resolveGenreText("(255)")).toBe("(255)");
});

it("keeps a bare out-of-range code unchanged", () => {
  expect(resolveGenreText("255")).toBe("255");
});

it("keeps plain genre text unchanged", () => {
  expect(resolveGenreText("Rock")).toBe("Rock");
});

it("keeps an empty string unchanged", () => {
  expect(resolveGenreText("")).toBe("");
});
