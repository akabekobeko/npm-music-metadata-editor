import type { AudioFormat, FormatSupportEntry, TagData, Track } from "@mme/ipc";
import { expect, it } from "vitest";
import type { TrackRow } from "../tracks/types.js";
import { isCellWritable } from "./isCellWritable";
import type { FormatSupportMap } from "./types.js";

const fakeTrack = (audioFormat: AudioFormat): Track => ({
  audioFormat,
  durationMs: 1000,
  tag: {},
  pictures: [],
  chapters: [],
  additionalFields: {},
  warnings: [],
});

const row = (audioFormat: AudioFormat): TrackRow => {
  const track = fakeTrack(audioFormat);
  return { filePath: `/${audioFormat}.bin`, track, origin: track, dirty: false };
};

type SupportEntryArgs = {
  readonly format: AudioFormat;
  readonly writableTagFields: readonly (keyof TagData)[];
  readonly extras?: Partial<Omit<FormatSupportEntry, "format" | "writableTagFields">>;
};

const supportEntry = ({
  format,
  writableTagFields,
  extras = {},
}: SupportEntryArgs): FormatSupportEntry => ({
  format,
  writableTagFields,
  supportsPictures: extras.supportsPictures ?? false,
  supportsChapters: extras.supportsChapters ?? false,
  supportsLyrics: extras.supportsLyrics ?? false,
});

const supportMap = (entries: readonly FormatSupportEntry[]): FormatSupportMap =>
  new Map(entries.map((entry) => [entry.format, entry]));

it("treats fileName as never writable even for fully-supported formats", () => {
  const support = supportMap([
    supportEntry({ format: "mp3", writableTagFields: ["title", "artist"] }),
  ]);
  expect(isCellWritable({ row: row("mp3"), columnId: "fileName", support })).toBe(false);
});

it("treats audioFormat / durationMs / warnings / chapters as never writable", () => {
  const support = supportMap([supportEntry({ format: "mp3", writableTagFields: ["title"] })]);
  expect(isCellWritable({ row: row("mp3"), columnId: "audioFormat", support })).toBe(false);
  expect(isCellWritable({ row: row("mp3"), columnId: "durationMs", support })).toBe(false);
  expect(isCellWritable({ row: row("mp3"), columnId: "warnings", support })).toBe(false);
  expect(isCellWritable({ row: row("mp3"), columnId: "chapters", support })).toBe(false);
});

it("returns true for tag fields the format supports", () => {
  const support = supportMap([
    supportEntry({ format: "mp3", writableTagFields: ["title", "artist"] }),
  ]);
  expect(isCellWritable({ row: row("mp3"), columnId: "tag.title", support })).toBe(true);
  expect(isCellWritable({ row: row("mp3"), columnId: "tag.artist", support })).toBe(true);
});

it("returns false for tag fields the format does not support", () => {
  const support = supportMap([supportEntry({ format: "wav", writableTagFields: ["title"] })]);
  expect(isCellWritable({ row: row("wav"), columnId: "tag.bpm", support })).toBe(false);
});

it("returns false for pictures when the format omits pictures support", () => {
  const support = supportMap([supportEntry({ format: "wav", writableTagFields: [] })]);
  expect(isCellWritable({ row: row("wav"), columnId: "pictures", support })).toBe(false);
});

it("returns true for pictures when the format supports them", () => {
  const support = supportMap([
    supportEntry({ format: "mp3", writableTagFields: [], extras: { supportsPictures: true } }),
  ]);
  expect(isCellWritable({ row: row("mp3"), columnId: "pictures", support })).toBe(true);
});

it("returns true for lyrics when the format supports them", () => {
  const support = supportMap([
    supportEntry({ format: "mp3", writableTagFields: [], extras: { supportsLyrics: true } }),
  ]);
  expect(isCellWritable({ row: row("mp3"), columnId: "lyrics", support })).toBe(true);
});

it("returns false when the format is missing from the support map", () => {
  const support: FormatSupportMap = new Map();
  expect(isCellWritable({ row: row("mp3"), columnId: "tag.title", support })).toBe(false);
});
