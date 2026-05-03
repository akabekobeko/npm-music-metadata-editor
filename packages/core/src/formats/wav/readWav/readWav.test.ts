import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the WAV format as a side effect.
import { readMetadata } from "../../../mme.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/wav",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("reads a LIST/INFO fixture", async () => {
  const bytes = await loadFixture("list-info.wav");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("wav");
  expect(result.tag).toMatchObject({
    title: "WAV title",
    artist: "WAV artist",
    album: "WAV album",
    comment: "WAV comment",
    year: 2024,
    trackNumber: 3,
  });
});

it("reads an id3 chunk fixture", async () => {
  const bytes = await loadFixture("id3.wav");
  const result = await readMetadata(bytes);
  expect(result.tag).toMatchObject({
    title: "WAV id3 title",
    artist: "WAV id3 artist",
    album: "WAV id3 album",
    year: 2023,
    trackNumber: 4,
    trackTotal: 12,
  });
});

it("lets the id3 chunk override LIST/INFO when both are present", async () => {
  const bytes = await loadFixture("list-and-id3.wav");
  const result = await readMetadata(bytes);
  expect(result.tag.title).toBe("Id3 title");
  expect(result.tag.artist).toBe("Id3 artist");
  // Comment was only in LIST/INFO so it falls through.
  expect(result.tag.comment).toBe("Info comment");
});
