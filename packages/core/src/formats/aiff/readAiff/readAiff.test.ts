import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the AIFF format as a side effect.
import { readMetadata } from "../../../mme.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/aiff",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("reads the native NAME / AUTH / (c) / ANNO chunks", async () => {
  const bytes = await loadFixture("native.aiff");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("aiff");
  expect(result.tag).toMatchObject({
    title: "AIFF title",
    artist: "AIFF artist",
    copyright: "(C) 2024 Tester",
    comment: "first annotation\nsecond annotation",
  });
});

it("reads an embedded ID3 chunk", async () => {
  const bytes = await loadFixture("id3.aiff");
  const result = await readMetadata(bytes);
  expect(result.tag).toMatchObject({
    title: "AIFF id3 title",
    artist: "AIFF id3 artist",
    album: "AIFF id3 album",
    year: 2023,
    trackNumber: 5,
    trackTotal: 9,
  });
});

it("lets the ID3 chunk override the native chunks when both are present", async () => {
  const bytes = await loadFixture("native-and-id3.aiff");
  const result = await readMetadata(bytes);
  expect(result.tag.title).toBe("Id3 title");
  expect(result.tag.artist).toBe("Id3 artist");
});
