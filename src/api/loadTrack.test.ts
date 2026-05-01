import { afterEach, beforeEach, expect, it } from "vitest";
import { clearRegistrations, registerFormat } from "../formats/registry.js";
import { loadTrack } from "./loadTrack.js";

beforeEach(() => {
  clearRegistrations();
});

afterEach(() => {
  clearRegistrations();
});

it("returns a Track populated with defaults when the reader omits optional fields", async () => {
  registerFormat({
    format: "mp3",
    extensions: [".mp3"],
    detectSignature: (h) => h.length >= 3 && h[0] === 0x49 && h[1] === 0x44 && h[2] === 0x33,
    read: async () => ({
      audioFormat: "mp3",
      tag: { title: "Hello" },
      pictures: [],
      chapters: [],
    }),
  });
  const track = await loadTrack(new Uint8Array([0x49, 0x44, 0x33, 0x03]));
  expect(track.audioFormat).toBe("mp3");
  expect(track.tag.title).toBe("Hello");
  expect(track.pictures).toEqual([]);
  expect(track.chapters).toEqual([]);
  expect(track.additionalFields).toEqual({});
  expect(track.warnings).toEqual([]);
  expect(track.durationMs).toBeUndefined();
  expect(track.lyrics).toBeUndefined();
});

it("forwards reader-provided durationMs / additionalFields / warnings", async () => {
  registerFormat({
    format: "flac",
    extensions: [".flac"],
    detectSignature: () => false,
    read: async () => ({
      audioFormat: "flac",
      tag: {},
      pictures: [],
      chapters: [],
      durationMs: 12345,
      additionalFields: { custom: "value" },
      warnings: [{ severity: "warn", message: "skipped frame" }],
    }),
  });
  const track = await loadTrack(new Uint8Array([0, 0]), { format: "flac" });
  expect(track.durationMs).toBe(12345);
  expect(track.additionalFields).toEqual({ custom: "value" });
  expect(track.warnings).toEqual([{ severity: "warn", message: "skipped frame" }]);
});
