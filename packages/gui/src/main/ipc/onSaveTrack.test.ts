import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { onSaveTrack } from "./onSaveTrack.js";

const writeMetadataMock = vi.hoisted(() =>
  vi.fn(
    async (_input: string | Uint8Array, _opts: unknown): Promise<Uint8Array> =>
      new Uint8Array([0xaa, 0xbb, 0xcc]),
  ),
);

vi.mock("@akabeko/music-metadata-editor", async () => {
  const actual = await vi.importActual<typeof import("@akabeko/music-metadata-editor")>(
    "@akabeko/music-metadata-editor",
  );
  return { ...actual, writeMetadata: writeMetadataMock };
});

type SendCall = readonly [string, unknown];

const buildEvent = (sink: SendCall[]): Electron.IpcMainInvokeEvent =>
  ({
    sender: {
      send: (channel: string, payload: unknown): void => {
        sink.push([channel, payload]);
      },
      isDestroyed: () => false,
    },
  }) as unknown as Electron.IpcMainInvokeEvent;

let dir = "";
let filePath = "";
let progress: SendCall[] = [];
let event: Electron.IpcMainInvokeEvent;

beforeEach(async () => {
  writeMetadataMock.mockReset();
  writeMetadataMock.mockResolvedValue(new Uint8Array([0xaa, 0xbb, 0xcc]));
  dir = await mkdtemp(join(tmpdir(), "mme-onSaveTrack-"));
  filePath = join(dir, "song.mp3");
  progress = [];
  event = buildEvent(progress);
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

it("forwards request fields to writeMetadata and overwrites the file in place", async () => {
  const result = await onSaveTrack(event, {
    filePath,
    tag: { title: "Edited" },
    pictures: [{ mimeType: "image/png", kind: 3, data: new Uint8Array([1, 2]) }],
  });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.filePath).toBe(filePath);
    expect(result.value.warnings).toEqual([]);
  }

  expect(writeMetadataMock).toHaveBeenCalledTimes(1);
  const [calledPath, calledOptions] = writeMetadataMock.mock.calls[0] ?? [];
  expect(calledPath).toBe(filePath);
  expect(calledOptions).toMatchObject({
    tag: { title: "Edited" },
    pictures: [{ mimeType: "image/png", kind: 3 }],
  });

  const written = await readFile(filePath);
  expect(Array.from(written)).toEqual([0xaa, 0xbb, 0xcc]);
});

it("emits writing then done on success via mme:progress:save", async () => {
  await onSaveTrack(event, { filePath, tag: {} });
  expect(progress.map(([, payload]) => payload)).toEqual([
    { filePath, phase: "writing" },
    { filePath, phase: "done" },
  ]);
});

it("returns the underlying error and skips the done event on failure", async () => {
  writeMetadataMock.mockRejectedValueOnce(new Error("boom"));

  const result = await onSaveTrack(event, { filePath, tag: {} });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.message).toBe("boom");
  }

  expect(progress.map(([, payload]) => payload)).toEqual([{ filePath, phase: "writing" }]);
});

it("preserves Uint8Array picture data across the request boundary", async () => {
  const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  await onSaveTrack(event, {
    filePath,
    tag: {},
    pictures: [{ mimeType: "image/png", kind: 3, data }],
  });

  const [, calledOptions] = writeMetadataMock.mock.calls[0] ?? [];
  const opts = calledOptions as { pictures: ReadonlyArray<{ data: Uint8Array }> };
  expect(opts.pictures[0]?.data).toBeInstanceOf(Uint8Array);
  expect(Array.from(opts.pictures[0]?.data ?? [])).toEqual(Array.from(data));
});
