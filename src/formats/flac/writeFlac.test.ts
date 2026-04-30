import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { readMetadata, writeMetadata } from "../../mme.js";
import { parseFlac } from "./parseFlac/parseFlac.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../tests/fixtures/flac",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("round-trips updated tags through read → write → read", async () => {
  const original = await loadFixture("basic.flac");
  const updated = await writeMetadata(original, {
    tag: {
      title: "New Title",
      artist: "New Artist",
      album: "New Album",
      trackNumber: 5,
      trackTotal: 12,
      year: 2025,
    },
  });
  const result = await readMetadata(updated);
  expect(result.tag).toMatchObject({
    title: "New Title",
    artist: "New Artist",
    album: "New Album",
    trackNumber: 5,
    trackTotal: 12,
    year: 2025,
  });
});

it("keeps the audio offset stable when padding can absorb the new tag", async () => {
  const original = await loadFixture("basic.flac");
  const before = parseFlac(original);
  // Same-size tag: the padding budget should fully absorb the rewrite.
  const updated = await writeMetadata(original, {
    tag: { title: "FLAC basic", artist: "Tester" },
  });
  const after = parseFlac(updated);
  expect(after.audioOffset).toBe(before.audioOffset);
  // Audio bytes are also identical (the trailing payload is preserved verbatim).
  expect(updated.subarray(after.audioOffset)).toEqual(original.subarray(before.audioOffset));
});

it("expands the metadata region when the new tag is too large for the padding", async () => {
  // The "tight-padding" fixture is generated with a metadata region that
  // already had to grow on initial assembly, so any non-trivial edit forces
  // another grow. Verify the audio bytes are still preserved verbatim.
  const original = await loadFixture("tight-padding.flac");
  const before = parseFlac(original);
  const updated = await writeMetadata(original, {
    tag: {
      title: `Way longer title than fit before ${"x".repeat(200)}`,
      artist: `Long-named artist ${"y".repeat(200)}`,
    },
  });
  const after = parseFlac(updated);
  expect(after.audioOffset).toBeGreaterThanOrEqual(before.audioOffset);
  expect(updated.subarray(after.audioOffset)).toEqual(original.subarray(before.audioOffset));
});

it("preserves embedded pictures across a write", async () => {
  const original = await loadFixture("with-picture.flac");
  const updated = await writeMetadata(original, {
    tag: { title: "Updated Title" },
  });
  const result = await readMetadata(updated);
  expect(result.tag.title).toBe("Updated Title");
  expect(result.pictures).toHaveLength(1);
  expect(result.pictures[0]?.mimeType).toBe("image/png");
});

it("preserves unmanaged Vorbis Comment entries (e.g. multi-value ARTIST)", async () => {
  const original = await loadFixture("with-picture.flac");
  // Round-trip without changing tag fields. The fixture includes two ARTIST
  // entries; the first wins as `tag.artist`, but the writer should still
  // re-emit any extras through `preserveEntries`.
  const updated = await writeMetadata(original, { tag: {} });
  const reparsed = parseFlac(updated);
  const artistEntries = reparsed.vorbisComment?.comments.filter((c) => c.key === "ARTIST") ?? [];
  expect(artistEntries.map((c) => c.value)).toEqual(["Tester", "Tester (alternate)"]);
});
