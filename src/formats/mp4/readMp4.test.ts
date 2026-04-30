import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { readMp4 } from "./readMp4.js";

const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../tests/fixtures/mp4");

const loadFixture = async (name: string): Promise<Uint8Array> =>
  new Uint8Array(await readFile(resolve(FIXTURE_DIR, name)));

it("decodes the iTunes ilst from a basic M4A fixture", async () => {
  const bytes = await loadFixture("basic.m4a");
  const result = await readMp4(bytes);

  expect(result.audioFormat).toBe("m4a");
  expect(result.tag.title).toBe("MP4 basic");
  expect(result.tag.artist).toBe("Tester");
  expect(result.tag.album).toBe("Phase4 Album");
  expect(result.tag.trackNumber).toBe(2);
  expect(result.tag.trackTotal).toBe(10);
  expect(result.tag.year).toBe(2026);
  expect(result.pictures).toEqual([]);
});

it("decodes embedded covr picture data", async () => {
  const bytes = await loadFixture("with-picture.m4a");
  const result = await readMp4(bytes);

  expect(result.tag.title).toBe("MP4 with picture");
  expect(result.pictures).toHaveLength(1);
  expect(result.pictures[0]?.mimeType).toBe("image/png");
});
