import type { Track } from "@akabeko/music-metadata-editor";
import { describe, expect, it } from "vitest";
import type { ReadCommandOptions } from "../types.js";
import { formatTrack } from "./formatTrack.js";

const baseOptions = (overrides: Partial<ReadCommandOptions>): ReadCommandOptions => ({
  source: { kind: "file", path: "x.mp3" },
  outputMode: "json",
  noWarnings: false,
  ...overrides,
});

const fixtures: Record<string, Track> = {
  empty: {
    audioFormat: "mp3",
    tag: {},
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [],
  },
  withPicture: {
    audioFormat: "mp3",
    durationMs: 12345,
    tag: { title: "Hello", artist: "World", trackNumber: 1, trackTotal: 4 },
    pictures: [
      {
        mimeType: "image/jpeg",
        kind: 3,
        description: "front",
        data: new Uint8Array([1, 2, 3, 4, 5]),
      },
    ],
    chapters: [],
    additionalFields: {},
    warnings: [],
  },
  withLyrics: {
    audioFormat: "mp3",
    tag: { title: "Lyrics Test" },
    pictures: [],
    chapters: [],
    lyrics: {
      language: "eng",
      description: "Lyrics",
      unsynchronized: "Hello, world\nLine two\n",
    },
    additionalFields: {},
    warnings: [],
  },
  withWarnings: {
    audioFormat: "flac",
    tag: { title: "Has warnings" },
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [
      { severity: "warn", message: "skipped malformed frame", code: "id3v2-bad-frame" },
      { severity: "info", message: "ignored unknown atom" },
    ],
  },
  withAdditional: {
    audioFormat: "mp3",
    tag: { title: "Has extras" },
    pictures: [],
    chapters: [],
    additionalFields: { CUSTOM: "yes", REPLAYGAIN_TRACK_GAIN: "-7.5 dB" },
    warnings: [],
  },
};

describe("formatTrack — JSON mode", () => {
  for (const [name, track] of Object.entries(fixtures)) {
    it(`renders ${name} fixture`, () => {
      const result = formatTrack({ track, options: baseOptions({}) });
      expect(result).toMatchSnapshot();
    });
  }

  it("honors --include", () => {
    const result = formatTrack({
      track: fixtures.withPicture as Track,
      options: baseOptions({ include: ["audioFormat", "tag"] }),
    });
    expect(result).toMatchSnapshot();
  });

  it("honors --exclude", () => {
    const result = formatTrack({
      track: fixtures.withPicture as Track,
      options: baseOptions({ exclude: ["pictures", "warnings"] }),
    });
    expect(result).toMatchSnapshot();
  });

  it("drops warnings when noWarnings is set", () => {
    const result = formatTrack({
      track: fixtures.withWarnings as Track,
      options: baseOptions({ noWarnings: true }),
    });
    expect(result).toMatchSnapshot();
  });
});

describe("formatTrack — pretty mode", () => {
  for (const [name, track] of Object.entries(fixtures)) {
    it(`renders ${name} fixture`, () => {
      const result = formatTrack({ track, options: baseOptions({ outputMode: "pretty" }) });
      expect(result).toMatchSnapshot();
    });
  }
});

describe("formatTrack — field mode", () => {
  it("returns a scalar value as plain text", () => {
    const result = formatTrack({
      track: fixtures.withPicture as Track,
      options: baseOptions({ outputMode: "field", field: "title" }),
    });
    expect(result).toEqual({ kind: "field", value: "Hello\n" });
  });

  it("returns a scalar number as plain text", () => {
    const result = formatTrack({
      track: fixtures.withPicture as Track,
      options: baseOptions({ outputMode: "field", field: "durationMs" }),
    });
    expect(result).toEqual({ kind: "field", value: "12345\n" });
  });

  it("returns the audio format directly", () => {
    const result = formatTrack({
      track: fixtures.withPicture as Track,
      options: baseOptions({ outputMode: "field", field: "audioFormat" }),
    });
    expect(result).toEqual({ kind: "field", value: "mp3\n" });
  });

  it("renders compound values as JSON", () => {
    const result = formatTrack({
      track: fixtures.withPicture as Track,
      options: baseOptions({ outputMode: "field", field: "tag" }),
    });
    expect(result.kind).toBe("field");
    if (result.kind === "field") {
      expect(result.value).toContain('"title": "Hello"');
      expect(result.value.endsWith("\n")).toBe(true);
    }
  });

  it("scrubs picture binaries when --field returns the array", () => {
    const result = formatTrack({
      track: fixtures.withPicture as Track,
      options: baseOptions({ outputMode: "field", field: "pictures" }),
    });
    expect(result.kind).toBe("field");
    if (result.kind === "field") {
      expect(result.value).toContain('"byteLength": 5');
      expect(result.value).not.toContain('"data"');
    }
  });

  it("throws Error('field \"X\" not found') for missing paths", () => {
    expect(() =>
      formatTrack({
        track: fixtures.empty as Track,
        options: baseOptions({ outputMode: "field", field: "nonexistent" }),
      }),
    ).toThrow('field "nonexistent" not found');
  });
});
