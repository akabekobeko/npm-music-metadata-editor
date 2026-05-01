import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the Ogg formats as a side effect.
import { readMetadata } from "../../../mme.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/ogg",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("reads the Vorbis fixture and projects fields onto TagData", async () => {
  const bytes = await loadFixture("vorbis-basic.ogg");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("ogg");
  expect(result.tag).toMatchObject({
    title: "OGG Vorbis basic",
    artist: "Tester",
    album: "Phase5 Album",
    trackNumber: 3,
    trackTotal: 9,
    recordingDate: "2024-05-01",
    year: 2024,
  });
  expect(result.pictures).toEqual([]);
});

it("reads the Opus fixture as audioFormat='opus'", async () => {
  const bytes = await loadFixture("opus-basic.opus");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("opus");
  expect(result.tag).toMatchObject({
    title: "Opus basic",
    artist: "Tester",
    album: "Phase5 Album",
    trackNumber: 1,
  });
});

it("reads the multi-tag Vorbis fixture without losing the long DESCRIPTION", async () => {
  const bytes = await loadFixture("vorbis-multipage.ogg");
  const result = await readMetadata(bytes);
  expect(result.tag.title).toBe("OGG Vorbis multipage");
  expect(result.tag.description?.length).toBe(600);
});
