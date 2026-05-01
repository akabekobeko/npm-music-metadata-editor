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
