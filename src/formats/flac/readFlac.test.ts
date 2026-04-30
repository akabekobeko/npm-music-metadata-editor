import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the FLAC format as a side effect.
import { readMetadata } from "../../mme.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../tests/fixtures/flac",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("reads the basic FLAC fixture", async () => {
  const bytes = await loadFixture("basic.flac");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("flac");
  expect(result.tag).toMatchObject({
    title: "FLAC basic",
    artist: "Tester",
    album: "Phase3 Album",
    trackNumber: 2,
    trackTotal: 10,
    recordingDate: "2024-04-01",
    year: 2024,
  });
  expect(result.pictures).toEqual([]);
});

it("reads embedded pictures and keeps the first multi-value entry", async () => {
  const bytes = await loadFixture("with-picture.flac");
  const result = await readMetadata(bytes);
  expect(result.tag).toMatchObject({
    title: "FLAC with picture",
    artist: "Tester",
    album: "Phase3 Album",
  });
  expect(result.pictures).toHaveLength(1);
  const picture = result.pictures[0];
  expect(picture?.mimeType).toBe("image/png");
  expect(picture?.kind).toBe(3);
  expect(picture?.data.length ?? 0).toBeGreaterThan(0);
});
