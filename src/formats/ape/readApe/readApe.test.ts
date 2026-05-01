import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the APE format as a side effect.
import { readMetadata } from "../../../mme.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/ape",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("reads a basic APE v2 fixture", async () => {
  const bytes = await loadFixture("basic.ape");
  const result = await readMetadata(bytes);
  expect(result.audioFormat).toBe("ape");
  expect(result.tag).toMatchObject({
    title: "APE basic",
    artist: "Tester",
    album: "Phase6 Album",
    trackNumber: 2,
    trackTotal: 9,
    year: 2024,
    genre: "Rock",
  });
});

it("ignores binary items (cover art) in the projected TagData", async () => {
  const bytes = await loadFixture("with-picture.ape");
  const result = await readMetadata(bytes);
  expect(result.tag.title).toBe("APE with picture");
  // Pictures stay empty in Phase 6 — Phase 9 will surface them.
  expect(result.pictures).toEqual([]);
});

it("reads a legacy v1 (footer-only) APE tag", async () => {
  const bytes = await loadFixture("v1-no-header.ape");
  const result = await readMetadata(bytes);
  expect(result.tag.title).toBe("APE v1");
  expect(result.tag.artist).toBe("Tester");
  expect(result.tag.trackNumber).toBe(1);
});
