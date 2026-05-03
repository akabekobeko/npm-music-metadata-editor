import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the WMA format as a side effect.
import { readMetadata } from "../../../mme.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/wma",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("reads a Content Description-only fixture", async () => {
  const bytes = await loadFixture("content-only.wma");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("wma");
  expect(result.tag).toMatchObject({
    title: "WMA basic title",
    artist: "WMA basic artist",
    copyright: "© 2026 fixtures",
    comment: "Phase 8 fixture",
  });
});

it("reads an Extended Content Description-only fixture", async () => {
  const bytes = await loadFixture("extended-only.wma");
  const result = await readMetadata(bytes);
  expect(result.tag).toMatchObject({
    album: "Extended only album",
    trackNumber: 5,
    trackTotal: 13,
    genre: "Test",
    year: 2025,
  });
  expect(result.tag.rating).toBeCloseTo(75 / 99);
});

it("reads a fixture that carries both descriptions", async () => {
  const bytes = await loadFixture("both-descriptions.wma");
  const result = await readMetadata(bytes);
  expect(result.tag).toMatchObject({
    title: "Both title",
    artist: "Both author",
    album: "Both album",
    composer: "Composer X",
    comment: "Stored in Content Description",
  });
});
