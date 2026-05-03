import type { TagData } from "@akabeko/music-metadata-editor";
import { describe, expect, it } from "vitest";
import { applyOverrides } from "./applyOverrides.js";

const base = (): TagData => ({
  title: "Original Title",
  artist: "Original Artist",
  album: "Original Album",
  year: 2020,
});

describe("applyOverrides", () => {
  it("preserves untouched fields and overlays assignments", () => {
    const result = applyOverrides({
      current: base(),
      overrides: { assign: { title: "New" }, clear: [], clearAll: false },
    });
    expect(result).toEqual({
      title: "New",
      artist: "Original Artist",
      album: "Original Album",
      year: 2020,
    });
  });

  it("does not mutate the input tag", () => {
    const current = base();
    applyOverrides({
      current,
      overrides: { assign: { title: "New" }, clear: ["artist"], clearAll: false },
    });
    expect(current).toEqual(base());
  });

  it("removes fields listed in clear", () => {
    const result = applyOverrides({
      current: base(),
      overrides: { assign: {}, clear: ["artist", "year"], clearAll: false },
    });
    expect(result).toEqual({ title: "Original Title", album: "Original Album" });
  });

  it("clearAll empties the tag before assignments are applied", () => {
    const result = applyOverrides({
      current: base(),
      overrides: { assign: { title: "Reset" }, clear: [], clearAll: true },
    });
    expect(result).toEqual({ title: "Reset" });
  });

  it("clear over a missing field is a no-op", () => {
    const result = applyOverrides({
      current: base(),
      overrides: { assign: {}, clear: ["genre"], clearAll: false },
    });
    expect(result).toEqual(base());
  });

  it("explicit empty-string assignment survives clear precedence", () => {
    const result = applyOverrides({
      current: base(),
      overrides: { assign: { artist: "" }, clear: [], clearAll: false },
    });
    expect(result.artist).toBe("");
  });
});
