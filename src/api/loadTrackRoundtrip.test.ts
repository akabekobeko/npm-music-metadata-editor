import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, it } from "vitest";
// Importing mme registers all built-in formats as a side effect.
import { loadTrack, saveTrack } from "../mme.js";

const fixturePath = (rel: string): string =>
  resolve(import.meta.dirname, "../../tests/fixtures", rel);

it("loadTrack → saveTrack → loadTrack preserves edited title (mp3)", async () => {
  const bytes = await readFile(fixturePath("mp3/v23-basic.mp3"));
  const original = await loadTrack(bytes);
  const edited = { ...original, tag: { ...original.tag, title: "Roundtrip MP3" } };
  const rebuilt = await saveTrack(edited, { source: bytes });
  expect(rebuilt).toBeInstanceOf(Uint8Array);
  if (rebuilt === undefined) {
    return;
  }

  const reloaded = await loadTrack(rebuilt);
  expect(reloaded.tag.title).toBe("Roundtrip MP3");
});

it("loadTrack → saveTrack → loadTrack preserves edited title (flac)", async () => {
  const bytes = await readFile(fixturePath("flac/basic.flac"));
  const original = await loadTrack(bytes);
  const edited = { ...original, tag: { ...original.tag, title: "Roundtrip FLAC" } };
  const rebuilt = await saveTrack(edited, { source: bytes });
  if (rebuilt === undefined) {
    expect.fail("expected rebuilt bytes for buffer source");
  }

  const reloaded = await loadTrack(rebuilt);
  expect(reloaded.tag.title).toBe("Roundtrip FLAC");
});

it("loadTrack → saveTrack → loadTrack preserves edited title (mp4)", async () => {
  const bytes = await readFile(fixturePath("mp4/basic.m4a"));
  const original = await loadTrack(bytes);
  const edited = { ...original, tag: { ...original.tag, title: "Roundtrip MP4" } };
  const rebuilt = await saveTrack(edited, { source: bytes });
  if (rebuilt === undefined) {
    expect.fail("expected rebuilt bytes for buffer source");
  }

  const reloaded = await loadTrack(rebuilt);
  expect(reloaded.tag.title).toBe("Roundtrip MP4");
});

it("loadTrack → saveTrack → loadTrack preserves edited title (ogg vorbis)", async () => {
  const bytes = await readFile(fixturePath("ogg/vorbis-basic.ogg"));
  const original = await loadTrack(bytes);
  const edited = { ...original, tag: { ...original.tag, title: "Roundtrip OGG" } };
  const rebuilt = await saveTrack(edited, { source: bytes });
  if (rebuilt === undefined) {
    expect.fail("expected rebuilt bytes for buffer source");
  }

  const reloaded = await loadTrack(rebuilt);
  expect(reloaded.tag.title).toBe("Roundtrip OGG");
});

it("loadTrack populates the default empty additionalFields and warnings", async () => {
  const bytes = await readFile(fixturePath("mp3/v23-basic.mp3"));
  const track = await loadTrack(bytes);
  expect(track.additionalFields).toEqual({});
  expect(track.warnings).toEqual([]);
});
