import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { readMetadata, writeMetadata } from "../../../mme.js";
import { ApeItemKind } from "../../../tags/ape/constants.js";
import { readApeTag } from "../../../tags/ape/readApeTag/readApeTag.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/ape",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("rewrites tag values while keeping audio bytes verbatim", async () => {
  const bytes = await loadFixture("basic.ape");
  const original = readApeTag(bytes);
  if (original === undefined) {
    throw new Error("fixture missing APE tag");
  }

  const audioBefore = bytes.subarray(0, bytes.length - original.totalSize);

  const updated = await writeMetadata(bytes, {
    tag: { title: "Updated", artist: "New Artist" },
  });
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.title).toBe("Updated");
  expect(reparsed.tag.artist).toBe("New Artist");
  // Other fields fall through from the existing tag because the writer
  // preserves items whose key isn't in the high-level mapping.
  expect(reparsed.tag.album).toBe("Phase6 Album");

  const updatedTag = readApeTag(updated);
  if (updatedTag === undefined) {
    throw new Error("rewritten file missing APE tag");
  }

  const audioAfter = updated.subarray(0, updated.length - updatedTag.totalSize);
  expect(audioAfter).toEqual(audioBefore);
});

it("preserves binary cover-art items through a round-trip", async () => {
  const bytes = await loadFixture("with-picture.ape");
  const updated = await writeMetadata(bytes, { tag: { title: "renamed" } });
  const reparsed = readApeTag(updated);
  const cover = reparsed?.items.find((item) => item.kind === ApeItemKind.Binary);
  expect(cover).toBeDefined();
  expect(cover?.value).toBeInstanceOf(Uint8Array);
});

it("clears a field when the tag value is set to an empty string", async () => {
  const bytes = await loadFixture("basic.ape");
  const updated = await writeMetadata(bytes, { tag: { genre: "" } });
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.genre).toBeUndefined();
});

it("removes numeric fields when they are set to null", async () => {
  const bytes = await loadFixture("basic.ape");
  const updated = await writeMetadata(bytes, { tag: { year: null, trackTotal: null } });
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.year).toBeUndefined();
  expect(reparsed.tag.trackTotal).toBeUndefined();
  expect(reparsed.tag.trackNumber).toBe(2);
  expect(reparsed.tag.genre).toBe("Rock");

  const items = readApeTag(updated)?.items.map((item) => item.key.toUpperCase()) ?? [];
  expect(items).not.toContain("YEAR");
});

it("preserves numeric fields left undefined", async () => {
  const bytes = await loadFixture("basic.ape");
  const updated = await writeMetadata(bytes, { tag: { title: "Renamed", year: undefined } });
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.year).toBe(2024);
});

it("round-trips rating through the Rating item", async () => {
  const bytes = await loadFixture("basic.ape");
  const rewritten = await writeMetadata(bytes, { tag: { rating: 0.9 } });
  expect((await readMetadata(rewritten)).tag.rating).toBeCloseTo(0.9, 10);
  const keys = readApeTag(rewritten)?.items.map((item) => item.key) ?? [];
  expect(keys).toContain("Rating");

  const cleared = await writeMetadata(rewritten, { tag: { rating: null } });
  expect((await readMetadata(cleared)).tag.rating).toBeUndefined();
});
