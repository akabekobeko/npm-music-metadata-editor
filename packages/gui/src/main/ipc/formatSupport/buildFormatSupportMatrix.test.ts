import { describe, expect, it } from "vitest";
import { buildFormatSupportMatrix } from "./buildFormatSupportMatrix.js";

describe("buildFormatSupportMatrix", () => {
  it("matches the snapshot of supported formats", () => {
    const matrix = buildFormatSupportMatrix();
    const summary = matrix.map((entry) => ({
      format: entry.format,
      tagFieldCount: entry.writableTagFields.length,
      supportsPictures: entry.supportsPictures,
      supportsChapters: entry.supportsChapters,
      supportsLyrics: entry.supportsLyrics,
    }));

    expect(summary).toMatchInlineSnapshot(`
      [
        {
          "format": "mp3",
          "supportsChapters": true,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "flac",
          "supportsChapters": false,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "mp4",
          "supportsChapters": true,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "m4a",
          "supportsChapters": true,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "ogg",
          "supportsChapters": false,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "opus",
          "supportsChapters": false,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "wav",
          "supportsChapters": true,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "aiff",
          "supportsChapters": true,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "wma",
          "supportsChapters": false,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
        {
          "format": "ape",
          "supportsChapters": false,
          "supportsLyrics": true,
          "supportsPictures": true,
          "tagFieldCount": 26,
        },
      ]
    `);
  });

  it("includes title and artist in every format's writable fields", () => {
    const matrix = buildFormatSupportMatrix();
    for (const entry of matrix) {
      expect(entry.writableTagFields).toContain("title");
      expect(entry.writableTagFields).toContain("artist");
    }
  });

  it("returns a fresh array on every call", () => {
    expect(buildFormatSupportMatrix()).not.toBe(buildFormatSupportMatrix());
  });
});
