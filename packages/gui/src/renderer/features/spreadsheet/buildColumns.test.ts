import { expect, it } from "vitest";
import { buildColumns } from "./buildColumns";
import { ALL_COLUMN_IDS, DEFAULT_VISIBLE_IDS } from "./constants";
import type { FormatSupportMap } from "./types";

const emptySupport: FormatSupportMap = new Map();

it("returns the default visible columns in declared order", () => {
  const columns = buildColumns(DEFAULT_VISIBLE_IDS, emptySupport);
  expect(columns.map((c) => c.id)).toMatchInlineSnapshot(`
    [
      "fileName",
      "audioFormat",
      "durationMs",
      "tag.title",
      "tag.artist",
      "tag.album",
      "tag.albumArtist",
      "tag.trackNumber",
      "tag.year",
      "tag.genre",
      "pictures",
      "lyrics",
      "warnings",
    ]
  `);
});

it("returns every column when all ids are visible (snapshot)", () => {
  const columns = buildColumns(ALL_COLUMN_IDS, emptySupport);
  expect(columns.map((c) => c.id)).toMatchInlineSnapshot(`
    [
      "fileName",
      "audioFormat",
      "durationMs",
      "warnings",
      "pictures",
      "lyrics",
      "chapters",
      "tag.title",
      "tag.artist",
      "tag.album",
      "tag.albumArtist",
      "tag.composer",
      "tag.conductor",
      "tag.lyricist",
      "tag.publisher",
      "tag.copyright",
      "tag.comment",
      "tag.genre",
      "tag.group",
      "tag.description",
      "tag.language",
      "tag.isrc",
      "tag.productId",
      "tag.year",
      "tag.recordingDate",
      "tag.originalReleaseDate",
      "tag.publishingDate",
      "tag.trackNumber",
      "tag.trackTotal",
      "tag.discNumber",
      "tag.discTotal",
      "tag.bpm",
      "tag.rating",
    ]
  `);
});

it("falls back to the pinned fileName column when visibleIds is empty", () => {
  const columns = buildColumns([], emptySupport);
  expect(columns.map((c) => c.id)).toEqual(["fileName"]);
  expect(columns[0]?.sticky).toBe("left");
});

it("prepends fileName when the caller forgets it", () => {
  const columns = buildColumns(["tag.title", "tag.year"], emptySupport);
  expect(columns.map((c) => c.id)).toEqual(["fileName", "tag.title", "tag.year"]);
});

it("preserves the caller's order when fileName is supplied explicitly", () => {
  const columns = buildColumns(["tag.title", "fileName", "tag.year"], emptySupport);
  expect(columns.map((c) => c.id)).toEqual(["tag.title", "fileName", "tag.year"]);
});

it("de-duplicates repeated ids while preserving the caller's order", () => {
  const columns = buildColumns(["tag.title", "tag.title", "fileName"], emptySupport);
  expect(columns.map((c) => c.id)).toEqual(["tag.title", "fileName"]);
});
