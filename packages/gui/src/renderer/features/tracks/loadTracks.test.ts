import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { IpcResult, LoadManyEntry, Track } from "../../../main/ipc/types.js";
import { loadTracks } from "./loadTracks";

const fakeTrack = (audioFormat: Track["audioFormat"], title: string): Track => ({
  audioFormat,
  durationMs: 1000,
  tag: { title },
  pictures: [],
  chapters: [],
  additionalFields: {},
  warnings: [],
});

const stubLoadMany = (
  impl: (request: { filePaths: readonly string[] }) => Promise<IpcResult<readonly LoadManyEntry[]>>,
): void => {
  vi.stubGlobal("window", { mme: { track: { loadMany: impl } } });
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("returns empty result without calling IPC for empty input", async () => {
  const spy = vi.fn();
  stubLoadMany(spy);
  const result = await loadTracks([]);
  expect(result).toEqual({ rows: [], errors: [] });
  expect(spy).not.toHaveBeenCalled();
});

it("maps successful entries to rows with `dirty: false`", async () => {
  const aTrack = fakeTrack("mp3", "A");
  const bTrack = fakeTrack("flac", "B");
  stubLoadMany(async () => ({
    ok: true,
    value: [
      { filePath: "/a.mp3", result: { ok: true, value: aTrack } },
      { filePath: "/b.flac", result: { ok: true, value: bTrack } },
    ],
  }));

  const result = await loadTracks(["/a.mp3", "/b.flac"]);
  expect(result.rows).toEqual([
    { filePath: "/a.mp3", track: aTrack, dirty: false },
    { filePath: "/b.flac", track: bTrack, dirty: false },
  ]);
  expect(result.errors).toEqual([]);
});

it("isolates per-file failures from successes", async () => {
  const aTrack = fakeTrack("mp3", "A");
  stubLoadMany(async () => ({
    ok: true,
    value: [
      { filePath: "/a.mp3", result: { ok: true, value: aTrack } },
      {
        filePath: "/b.bin",
        result: { ok: false, error: { name: "Error", message: "bad" } },
      },
    ],
  }));

  const result = await loadTracks(["/a.mp3", "/b.bin"]);
  expect(result.rows.map((row) => row.filePath)).toEqual(["/a.mp3"]);
  expect(result.errors).toEqual([{ filePath: "/b.bin", error: { name: "Error", message: "bad" } }]);
});

it("surfaces an envelope-level failure as a per-file error for every input path", async () => {
  stubLoadMany(async () => ({
    ok: false,
    error: { name: "NotImplemented", message: "x" },
  }));

  const result = await loadTracks(["/a.mp3", "/b.mp3"]);
  expect(result.rows).toEqual([]);
  expect(result.errors).toEqual([
    { filePath: "/a.mp3", error: { name: "NotImplemented", message: "x" } },
    { filePath: "/b.mp3", error: { name: "NotImplemented", message: "x" } },
  ]);
});
