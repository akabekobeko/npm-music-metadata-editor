import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the MP3 format as a side effect.
import { readMetadata } from "../../../mme.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/mp3",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("reads an ID3v2.3 fixture", async () => {
  const bytes = await loadFixture("v23-basic.mp3");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("mp3");
  expect(result.tag).toMatchObject({
    title: "v23 basic",
    artist: "Tester",
    album: "Phase2 Album",
    trackNumber: 1,
    trackTotal: 12,
    year: 2024,
    comment: "ID3v2.3 sample",
  });
});

it("reads an ID3v2.4 fixture with extras", async () => {
  const bytes = await loadFixture("v24-with-extras.mp3");
  const result = await readMetadata(bytes);
  expect(result.tag).toMatchObject({
    title: "v24 extras",
    artist: "Tester",
    album: "Phase2 Album",
    trackNumber: 3,
    trackTotal: 9,
    discNumber: 1,
    discTotal: 2,
    recordingDate: "2024-04-01",
    bpm: 120,
    comment: "ID3v2.4 sample",
  });
  // APIC / USLT structuring is Phase 9; pictures / lyrics stay empty here.
  expect(result.pictures).toEqual([]);
  expect(result.lyrics).toBeUndefined();
});

it("reads ID3v2 head while ID3v1 trailer is also present", async () => {
  const bytes = await loadFixture("v23-with-id3v1.mp3");
  const result = await readMetadata(bytes);
  // ID3v2 wins on overlapping fields, ID3v1 fills the rest.
  expect(result.tag.title).toBe("Both tags");
  expect(result.tag.artist).toBe("Tester");
  // Track / year only exist in the ID3v1 trailer for this fixture.
  expect(result.tag.trackNumber).toBe(7);
  expect(result.tag.year).toBe(2024);
});
