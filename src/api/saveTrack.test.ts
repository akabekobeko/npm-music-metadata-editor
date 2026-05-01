import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { clearRegistrations, registerFormat } from "../formats/registry.js";
import type { Track, WriteOptions } from "../types.js";
import { saveTrack } from "./saveTrack.js";

const trackOf = (overrides: Partial<Track> = {}): Track => ({
  audioFormat: "mp3",
  tag: { title: "Edited" },
  pictures: [],
  chapters: [],
  additionalFields: {},
  warnings: [],
  ...overrides,
});

let receivedOptions: WriteOptions | undefined;
let dir = "";
let sourcePath = "";

beforeEach(async () => {
  clearRegistrations();
  receivedOptions = undefined;
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
    write: async (input, opts) => {
      receivedOptions = opts;
      const out = new Uint8Array(input.length + 1);
      out.set(input);
      out[input.length] = 0xaa;
      return out;
    },
  });
  dir = await mkdtemp(join(tmpdir(), "mme-save-"));
  sourcePath = join(dir, "input.mp3");
  await writeFile(sourcePath, new Uint8Array([0x49, 0x44, 0x33]));
});

afterEach(async () => {
  clearRegistrations();
  await rm(dir, { recursive: true, force: true });
});

it("returns rebuilt bytes when the source is a Uint8Array and no outputPath is given", async () => {
  const source = new Uint8Array([0x49, 0x44, 0x33]);
  const result = await saveTrack(trackOf(), { source });
  expect(result).toBeInstanceOf(Uint8Array);
  expect(result?.[3]).toBe(0xaa);
  expect(receivedOptions?.tag.title).toBe("Edited");
  expect(receivedOptions?.format).toBe("mp3");
});

it("forwards pictures / chapters / lyrics into WriteOptions", async () => {
  const source = new Uint8Array([0x49, 0x44, 0x33]);
  const track = trackOf({
    pictures: [{ mimeType: "image/png", kind: 3, data: new Uint8Array([1, 2]) }],
    chapters: [{ id: "ch1", startMs: 0, endMs: 1000, title: "Intro" }],
    lyrics: { unsynchronized: "la la la" },
  });
  await saveTrack(track, { source });
  expect(receivedOptions?.pictures).toHaveLength(1);
  expect(receivedOptions?.chapters).toHaveLength(1);
  expect(receivedOptions?.lyrics?.unsynchronized).toBe("la la la");
});

it("overwrites the source file in place when source is a string and no outputPath is given", async () => {
  const result = await saveTrack(trackOf(), { source: sourcePath });
  expect(result).toBeUndefined();
  const written = await readFile(sourcePath);
  expect(written.byteLength).toBe(4);
  expect(written[3]).toBe(0xaa);
});

it("writes to outputPath when provided alongside a string source", async () => {
  const out = join(dir, "out.mp3");
  const result = await saveTrack(trackOf(), { source: sourcePath, outputPath: out });
  expect(result).toBeUndefined();
  const written = await readFile(out);
  expect(written.byteLength).toBe(4);
});

it("writes Uint8Array sources to outputPath when provided", async () => {
  const out = join(dir, "buffer-out.mp3");
  const source = new Uint8Array([0x49, 0x44, 0x33]);
  const result = await saveTrack(trackOf(), { source, outputPath: out });
  expect(result).toBeUndefined();
  const written = await readFile(out);
  expect(written.byteLength).toBe(4);
});
