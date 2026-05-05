import { describe, expect, it } from "vitest";
import type { AudioFormat, FormatSupportEntry, TagData, Track } from "../../../main/ipc/types.js";
import type { FormatSupportMap } from "../spreadsheet/types.js";
import type { TrackRow } from "../tracks/types.js";
import { applyPaste, parseClipboardText } from "./paste";

type RowSeed = {
  readonly filePath: string;
  readonly audioFormat: AudioFormat;
  readonly title?: string;
};

const buildRow = ({ filePath, audioFormat, title }: RowSeed): TrackRow => {
  const track: Track = {
    audioFormat,
    durationMs: 1000,
    tag: title === undefined ? {} : { title },
    pictures: [],
    chapters: [],
    additionalFields: {},
    warnings: [],
  };
  return { filePath, track, origin: track, dirty: false };
};

const supportEntry = (
  format: AudioFormat,
  writableTagFields: ReadonlyArray<keyof TagData>,
): FormatSupportEntry => ({
  format,
  writableTagFields,
  supportsPictures: false,
  supportsChapters: false,
  supportsLyrics: false,
});

const supportMap = (entries: readonly FormatSupportEntry[]): FormatSupportMap =>
  new Map(entries.map((entry) => [entry.format, entry]));

describe("parseClipboardText", () => {
  it("returns an empty array for empty input", () => {
    expect(parseClipboardText("")).toEqual([]);
  });

  it("splits LF-separated records", () => {
    expect(parseClipboardText("a\nb\nc")).toEqual(["a", "b", "c"]);
  });

  it("normalizes CRLF and drops one trailing newline", () => {
    expect(parseClipboardText("a\r\nb\r\nc\r\n")).toEqual(["a", "b", "c"]);
  });

  it("normalizes lone CR", () => {
    expect(parseClipboardText("a\rb\rc")).toEqual(["a", "b", "c"]);
  });

  it("keeps only the first column from a TSV payload", () => {
    expect(parseClipboardText("a\tx\nb\ty")).toEqual(["a", "b"]);
  });

  it("preserves interior empty lines", () => {
    expect(parseClipboardText("a\n\nb")).toEqual(["a", "", "b"]);
  });
});

describe("applyPaste", () => {
  it("applies values to writable tag cells in order", () => {
    const rows = [
      buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "A" }),
      buildRow({ filePath: "/b.mp3", audioFormat: "mp3", title: "B" }),
      buildRow({ filePath: "/c.mp3", audioFormat: "mp3", title: "C" }),
    ];
    const support = supportMap([supportEntry("mp3", ["title"])]);
    const result = applyPaste({
      rows,
      columnId: "tag.title",
      values: ["X", "Y", "Z"],
      support,
    });
    expect(result.applied).toBe(3);
    expect(result.skippedUnsupported).toBe(0);
    expect(result.skippedInvalid).toBe(0);
    expect(result.nextRows.map((row) => row.track.tag.title)).toEqual(["X", "Y", "Z"]);
    expect(result.nextRows.every((row) => row.dirty)).toBe(true);
  });

  it("discards extra clipboard values past the row count", () => {
    const rows = [buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "A" })];
    const support = supportMap([supportEntry("mp3", ["title"])]);
    const result = applyPaste({
      rows,
      columnId: "tag.title",
      values: ["X", "Y", "Z"],
      support,
    });
    expect(result.applied).toBe(1);
    expect(result.nextRows[0]?.track.tag.title).toBe("X");
  });

  it("leaves trailing rows untouched when the clipboard is shorter than the rows", () => {
    const rows = [
      buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "A" }),
      buildRow({ filePath: "/b.mp3", audioFormat: "mp3", title: "B" }),
      buildRow({ filePath: "/c.mp3", audioFormat: "mp3", title: "C" }),
    ];
    const support = supportMap([supportEntry("mp3", ["title"])]);
    const result = applyPaste({
      rows,
      columnId: "tag.title",
      values: ["X"],
      support,
    });
    expect(result.applied).toBe(1);
    expect(result.nextRows[0]?.track.tag.title).toBe("X");
    expect(result.nextRows[1]?.track.tag.title).toBe("B");
    expect(result.nextRows[2]?.track.tag.title).toBe("C");
  });

  it("counts cells in unsupported formats as skippedUnsupported", () => {
    const rows = [
      buildRow({ filePath: "/a.mp3", audioFormat: "mp3", title: "A" }),
      buildRow({ filePath: "/b.wav", audioFormat: "wav", title: "B" }),
    ];
    const support = supportMap([supportEntry("mp3", ["title"]), supportEntry("wav", [])]);
    const result = applyPaste({
      rows,
      columnId: "tag.title",
      values: ["X", "Y"],
      support,
    });
    expect(result.applied).toBe(1);
    expect(result.skippedUnsupported).toBe(1);
    expect(result.nextRows[1]?.track.tag.title).toBe("B");
  });

  it("counts invalid values as skippedInvalid without mutating the row", () => {
    const rows = [
      buildRow({ filePath: "/a.mp3", audioFormat: "mp3" }),
      buildRow({ filePath: "/b.mp3", audioFormat: "mp3" }),
    ];
    const support = supportMap([supportEntry("mp3", ["year"])]);
    const result = applyPaste({
      rows,
      columnId: "tag.year",
      values: ["1999", "not-a-year"],
      support,
    });
    expect(result.applied).toBe(1);
    expect(result.skippedInvalid).toBe(1);
    expect(result.nextRows[0]?.track.tag.year).toBe(1999);
    expect(result.nextRows[1]?.track.tag.year).toBeUndefined();
  });

  it("rejects paste against non-tag columns", () => {
    const rows = [buildRow({ filePath: "/a.mp3", audioFormat: "mp3" })];
    const support = supportMap([supportEntry("mp3", ["title"])]);
    const result = applyPaste({
      rows,
      columnId: "fileName",
      values: ["X"],
      support,
    });
    expect(result.applied).toBe(0);
    expect(result.skippedUnsupported).toBe(1);
  });
});
