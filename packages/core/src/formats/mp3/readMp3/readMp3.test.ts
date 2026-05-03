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
  // APIC / USLT are surfaced through the public API.
  expect(result.pictures).toHaveLength(1);
  expect(result.pictures[0]?.mimeType).toBe("image/png");
  expect(result.lyrics?.unsynchronized).toBe("the quick brown fox jumps over the lazy dog");
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

it("merges ID3v2 + APE + ID3v1 by the default priority order", async () => {
  const bytes = await loadFixture("v23-with-ape-and-id3v1.mp3");
  const result = await readMetadata(bytes);
  // ID3v2 wins for `title` (present in all three flavours).
  expect(result.tag.title).toBe("ID3v2 Title");
  // `artist` is missing from ID3v2, so APE wins over ID3v1.
  expect(result.tag.artist).toBe("APE Artist");
  // `year` only exists in APE (and ID3v1) — APE wins.
  expect(result.tag.year).toBe(2025);
  // `trackNumber` only ID3v1 carries it.
  expect(result.tag.trackNumber).toBe(5);
});

it("honours a user-supplied tag priority", async () => {
  const bytes = await loadFixture("v23-with-ape-and-id3v1.mp3");
  // Force APE to win over ID3v2.
  const result = await readMetadata(bytes, { tagPriority: ["ape", "id3v2", "id3v1"] });
  expect(result.tag.title).toBe("APE Title");
  expect(result.tag.album).toBe("Phase6 Album");
});

it("skips tag sources omitted from priority", async () => {
  const bytes = await loadFixture("v23-with-ape-and-id3v1.mp3");
  const result = await readMetadata(bytes, { tagPriority: ["id3v1"] });
  expect(result.tag.title).toBe("ID3v1 Title");
  // ID3v2 / APE excluded — `album` from ID3v1 wins.
  expect(result.tag.album).toBe("ID3v1 Album");
});
