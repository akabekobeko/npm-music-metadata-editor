// @vitest-environment jsdom

import type { Track } from "@mme/ipc";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { TrackRow } from "../tracks/types.js";
import { saveDirtyRows } from "./saveDirtyRows.js";
import type { SaveProgress } from "./types.js";

const makeTrack = (): Track => ({
  audioFormat: "mp3",
  durationMs: 1000,
  tag: { title: "Edited" },
  pictures: [],
  chapters: [],
  additionalFields: {},
  warnings: [],
});

const makeRow = (filePath: string): TrackRow => {
  const track = makeTrack();
  return { filePath, track, origin: track, dirty: true };
};

type SaveResponse =
  | { ok: true; value: unknown }
  | { ok: false; error: { name: string; message: string } };

let saveMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  saveMock = vi.fn(
    async (_request: unknown): Promise<SaveResponse> => ({
      ok: true,
      value: { filePath: "ignored", warnings: [] },
    }),
  );
  Object.defineProperty(window, "mme", {
    configurable: true,
    value: {
      track: { save: saveMock },
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("invokes save for each row in series and produces matching results", async () => {
  const rows = [makeRow("/a.mp3"), makeRow("/b.mp3")];
  const summary = await saveDirtyRows({ rows, onProgress: () => {} });

  expect(saveMock).toHaveBeenCalledTimes(2);
  expect(summary.results.map((r) => r.filePath)).toEqual(["/a.mp3", "/b.mp3"]);
  expect(summary.cancelled).toBe(false);
});

it("emits start and done progress events with 1-based current and the running total", async () => {
  const rows = [makeRow("/a.mp3"), makeRow("/b.mp3")];
  const seen: SaveProgress[] = [];
  await saveDirtyRows({ rows, onProgress: (p) => seen.push(p) });

  expect(seen).toEqual([
    { current: 1, total: 2, filePath: "/a.mp3", phase: "start" },
    { current: 1, total: 2, filePath: "/a.mp3", phase: "done" },
    { current: 2, total: 2, filePath: "/b.mp3", phase: "start" },
    { current: 2, total: 2, filePath: "/b.mp3", phase: "done" },
  ]);
});

it("captures per-row IpcError without aborting the loop", async () => {
  saveMock.mockResolvedValueOnce({
    ok: false,
    error: { name: "MmeError", message: "boom" },
  });

  const rows = [makeRow("/a.mp3"), makeRow("/b.mp3")];
  const summary = await saveDirtyRows({ rows, onProgress: () => {} });

  expect(summary.results[0]?.error?.message).toBe("boom");
  expect(summary.results[1]?.error).toBeUndefined();
  expect(summary.cancelled).toBe(false);
});

it("stops iterating after isCancelled flips before the next row", async () => {
  let cancelled = false;
  saveMock.mockImplementationOnce(async () => {
    cancelled = true;
    return { ok: true, value: { filePath: "/a.mp3", warnings: [] } };
  });

  const rows = [makeRow("/a.mp3"), makeRow("/b.mp3"), makeRow("/c.mp3")];
  const summary = await saveDirtyRows({
    rows,
    onProgress: () => {},
    isCancelled: () => cancelled,
  });

  expect(saveMock).toHaveBeenCalledTimes(1);
  expect(summary.results).toHaveLength(1);
  expect(summary.cancelled).toBe(true);
});
