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

it("loadTrack → saveTrack → loadTrack preserves edited producer (mp3, involved-people frame)", async () => {
  const bytes = await readFile(fixturePath("mp3/v23-basic.mp3"));
  const original = await loadTrack(bytes);
  const edited = { ...original, tag: { ...original.tag, producer: "Roundtrip Producer" } };
  const rebuilt = await saveTrack(edited, { source: bytes });
  if (rebuilt === undefined) {
    expect.fail("expected rebuilt bytes for buffer source");
  }

  const reloaded = await loadTrack(rebuilt);
  expect(reloaded.tag.producer).toBe("Roundtrip Producer");
});

it("loadTrack → saveTrack → loadTrack preserves edited producer (flac)", async () => {
  const bytes = await readFile(fixturePath("flac/basic.flac"));
  const original = await loadTrack(bytes);
  const edited = { ...original, tag: { ...original.tag, producer: "Roundtrip Producer" } };
  const rebuilt = await saveTrack(edited, { source: bytes });
  if (rebuilt === undefined) {
    expect.fail("expected rebuilt bytes for buffer source");
  }

  const reloaded = await loadTrack(rebuilt);
  expect(reloaded.tag.producer).toBe("Roundtrip Producer");
});

it.each([
  ["flac", "flac/basic.flac"],
  ["m4a", "mp4/basic.m4a"],
  ["ape", "ape/basic.ape"],
  ["ogg vorbis", "ogg/vorbis-basic.ogg"],
  ["wma", "wma/extended-only.wma"],
  ["mp3", "mp3/v23-basic.mp3"],
])("saveTrack deletes a numeric field set to null (%s)", async (_label, rel) => {
  const bytes = await readFile(fixturePath(rel));
  const original = await loadTrack(bytes);
  const withBpm = await saveTrack(
    { ...original, tag: { ...original.tag, bpm: 128 } },
    { source: bytes },
  );
  if (withBpm === undefined) {
    expect.fail("expected rebuilt bytes for buffer source");
  }

  expect((await loadTrack(withBpm)).tag.bpm).toBe(128);

  const track = await loadTrack(withBpm);
  const cleared = await saveTrack(
    { ...track, tag: { ...track.tag, bpm: null } },
    { source: withBpm },
  );
  if (cleared === undefined) {
    expect.fail("expected rebuilt bytes for buffer source");
  }

  const reloaded = await loadTrack(cleared);
  expect(reloaded.tag.bpm).toBeUndefined();
  expect(reloaded.tag.title).toBe(track.tag.title);
});
