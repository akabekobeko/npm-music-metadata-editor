import { CommanderError } from "commander";
import { describe, expect, it } from "vitest";
import { parseTagOverrides } from "./parseTagOverrides.js";

describe("parseTagOverrides — individual flags", () => {
  it("turns string flags into the matching TagData keys", () => {
    const result = parseTagOverrides({
      opts: { title: "Hello", artist: "World", albumArtist: "VA" },
    });
    expect(result.assign).toEqual({ title: "Hello", artist: "World", albumArtist: "VA" });
    expect(result.clear).toEqual([]);
    expect(result.clearAll).toBe(false);
  });

  it("treats an empty string as an explicit assignment, not a clear", () => {
    const result = parseTagOverrides({ opts: { title: "" } });
    expect(result.assign).toEqual({ title: "" });
  });

  it("parses --year as integer with bounds at 0 and 9999", () => {
    expect(parseTagOverrides({ opts: { year: "0" } }).assign).toEqual({ year: 0 });
    expect(parseTagOverrides({ opts: { year: "9999" } }).assign).toEqual({ year: 9999 });
  });

  it("rejects --year with a non-integer value", () => {
    expect(() => parseTagOverrides({ opts: { year: "abc" } })).toThrow(CommanderError);
    expect(() => parseTagOverrides({ opts: { year: "1.5" } })).toThrow(/expected an integer/);
  });

  it("parses --rating as a float in [0, 1]", () => {
    expect(parseTagOverrides({ opts: { rating: "0.5" } }).assign).toEqual({ rating: 0.5 });
    expect(parseTagOverrides({ opts: { rating: "0" } }).assign).toEqual({ rating: 0 });
    expect(parseTagOverrides({ opts: { rating: "1" } }).assign).toEqual({ rating: 1 });
  });

  it("rejects --rating outside [0, 1]", () => {
    expect(() => parseTagOverrides({ opts: { rating: "1.5" } })).toThrow(/in \[0, 1\]/);
    expect(() => parseTagOverrides({ opts: { rating: "-0.1" } })).toThrow(/in \[0, 1\]/);
  });

  it('parses --track "3" as trackNumber only', () => {
    const result = parseTagOverrides({ opts: { track: "3" } });
    expect(result.assign).toEqual({ trackNumber: 3 });
  });

  it('parses --track "3/12" as trackNumber + trackTotal', () => {
    const result = parseTagOverrides({ opts: { track: "3/12" } });
    expect(result.assign).toEqual({ trackNumber: 3, trackTotal: 12 });
  });

  it("parses --disc the same way", () => {
    expect(parseTagOverrides({ opts: { disc: "1/2" } }).assign).toEqual({
      discNumber: 1,
      discTotal: 2,
    });
  });
});

describe("parseTagOverrides — --json bulk flag", () => {
  it("merges --json into assign", () => {
    const result = parseTagOverrides({
      opts: { json: '{"title":"Bulk","year":2026}' },
    });
    expect(result.assign).toEqual({ title: "Bulk", year: 2026 });
  });

  it("rejects unknown JSON keys", () => {
    expect(() => parseTagOverrides({ opts: { json: '{"bogus":"x"}' } })).toThrow(/unknown tag/);
  });

  it("rejects type-mismatched JSON values", () => {
    expect(() => parseTagOverrides({ opts: { json: '{"year":"2020"}' } })).toThrow(
      /expected integer/,
    );
  });

  it("rejects malformed JSON", () => {
    expect(() => parseTagOverrides({ opts: { json: "not-json" } })).toThrow(/invalid JSON/);
  });

  it("rejects a top-level non-object", () => {
    expect(() => parseTagOverrides({ opts: { json: "[]" } })).toThrow(/expected a JSON object/);
  });
});

describe("parseTagOverrides — precedence", () => {
  it("individual flags override --json", () => {
    const result = parseTagOverrides({
      opts: { json: '{"title":"From JSON","artist":"From JSON"}', title: "Override" },
    });
    expect(result.assign).toEqual({ title: "Override", artist: "From JSON" });
  });

  it("--json overrides --tag-file content", () => {
    const result = parseTagOverrides({
      opts: { json: '{"title":"JSON"}' },
      tagFile: { title: "TagFile", artist: "TagFile" },
    });
    expect(result.assign).toEqual({ title: "JSON", artist: "TagFile" });
  });

  it("individual flags trump everything", () => {
    const result = parseTagOverrides({
      opts: { json: '{"title":"JSON"}', title: "Flag" },
      tagFile: { title: "TagFile" },
    });
    expect(result.assign.title).toBe("Flag");
  });
});

describe("parseTagOverrides — --clear", () => {
  it("parses a single clear field", () => {
    const result = parseTagOverrides({ opts: { clear: ["title"] } });
    expect(result.clear).toEqual(["title"]);
    expect(result.clearAll).toBe(false);
  });

  it("parses comma-separated and repeated --clear into one list", () => {
    const result = parseTagOverrides({ opts: { clear: ["title,artist", "album"] } });
    expect(result.clear).toEqual(["title", "artist", "album"]);
  });

  it("recognises --clear all", () => {
    const result = parseTagOverrides({ opts: { clear: ["all"] } });
    expect(result.clearAll).toBe(true);
    expect(result.clear).toEqual([]);
  });

  it("rejects unknown fields", () => {
    expect(() => parseTagOverrides({ opts: { clear: ["bogus"] } })).toThrow(/unknown field/);
  });

  it("rejects --clear F + --F together", () => {
    expect(() => parseTagOverrides({ opts: { title: "X", clear: ["title"] } })).toThrow(
      /cannot --title and --clear title/,
    );
  });

  it("--clear all combined with assignments is allowed (wipe + reset pattern)", () => {
    const result = parseTagOverrides({ opts: { title: "After", clear: ["all"] } });
    expect(result.assign).toEqual({ title: "After" });
    expect(result.clearAll).toBe(true);
  });

  it("de-duplicates clear entries", () => {
    const result = parseTagOverrides({ opts: { clear: ["title,artist", "title"] } });
    expect(result.clear).toEqual(["title", "artist"]);
  });
});
