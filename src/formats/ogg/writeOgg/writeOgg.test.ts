import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { readMetadata, writeMetadata } from "../../../mme.js";
import { OGG_CRC_OFFSET } from "../constants.js";
import { crc32Ogg } from "../page/crc32.js";
import { parseOggPages } from "../page/parseOggPages.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/ogg",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

/**
 * Re-compute every page's CRC and report whether the embedded value matches.
 *
 * Used by tests to ensure the writer produces a byte-stream that any
 * compliant Ogg reader (libvorbisedit, ffmpeg, ...) would accept.
 */
const allCrcsValid = (bytes: Uint8Array): boolean => {
  for (const page of parseOggPages(bytes)) {
    const slice = bytes.slice(page.pageStart, page.pageStart + page.pageSize);
    slice[OGG_CRC_OFFSET] = 0;
    slice[OGG_CRC_OFFSET + 1] = 0;
    slice[OGG_CRC_OFFSET + 2] = 0;
    slice[OGG_CRC_OFFSET + 3] = 0;
    if (crc32Ogg(slice) !== page.crcChecksum) {
      return false;
    }
  }

  return true;
};

it("round-trips updated Vorbis tags through read → write → read", async () => {
  const original = await loadFixture("vorbis-basic.ogg");
  const updated = await writeMetadata(original, {
    tag: {
      title: "Updated Vorbis",
      artist: "New Artist",
      album: "New Album",
      trackNumber: 5,
      trackTotal: 12,
      year: 2025,
    },
  });
  expect(allCrcsValid(updated)).toBe(true);

  const result = await readMetadata(updated);
  expect(result.audioFormat).toBe("ogg");
  expect(result.tag).toMatchObject({
    title: "Updated Vorbis",
    artist: "New Artist",
    album: "New Album",
    trackNumber: 5,
    trackTotal: 12,
    year: 2025,
  });
});

it("round-trips Opus tags and preserves audioFormat='opus'", async () => {
  const original = await loadFixture("opus-basic.opus");
  const updated = await writeMetadata(original, {
    tag: { title: "Updated Opus", trackNumber: 2 },
  });
  expect(allCrcsValid(updated)).toBe(true);

  const result = await readMetadata(updated);
  expect(result.audioFormat).toBe("opus");
  expect(result.tag.title).toBe("Updated Opus");
  expect(result.tag.trackNumber).toBe(2);
  // Untouched fields survive the rewrite.
  expect(result.tag.artist).toBe("Tester");
  expect(result.tag.album).toBe("Phase5 Album");
});

it("renumbers trailing pages so sequence numbers stay contiguous", async () => {
  const original = await loadFixture("vorbis-multipage.ogg");
  const updated = await writeMetadata(original, {
    tag: { title: "tiny" },
  });
  expect(allCrcsValid(updated)).toBe(true);

  const sequences = Array.from(parseOggPages(updated)).map((page) => page.pageSequence);
  expect(sequences[0]).toBe(0);
  // Every subsequent page increments the sequence by exactly 1.
  for (let i = 1; i < sequences.length; i++) {
    expect(sequences[i]).toBe((sequences[i - 1] ?? 0) + 1);
  }
});

it("re-pages the comment block when growth forces multiple header pages", async () => {
  // Force a tag so large the comment packet exceeds 255 segments * 255 bytes
  // = 65 025 bytes, which is the per-page limit. The writer must split into
  // multiple header pages with the continuation flag set on subsequent ones.
  const original = await loadFixture("vorbis-basic.ogg");
  const updated = await writeMetadata(original, {
    tag: { description: "x".repeat(70_000) },
  });
  expect(allCrcsValid(updated)).toBe(true);

  const result = await readMetadata(updated);
  expect(result.tag.description?.length).toBe(70_000);
});

it("preserves untouched tag entries via preserveEntries", async () => {
  const original = await loadFixture("vorbis-basic.ogg");
  const updated = await writeMetadata(original, {
    tag: { title: "renamed" },
  });
  const result = await readMetadata(updated);
  expect(result.tag.title).toBe("renamed");
  // Fields the caller did not touch survive the rewrite.
  expect(result.tag.artist).toBe("Tester");
  expect(result.tag.album).toBe("Phase5 Album");
  expect(result.tag.trackNumber).toBe(3);
});
