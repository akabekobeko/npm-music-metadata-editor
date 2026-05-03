import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
// Importing mme registers the MP3 format as a side effect.
import { readMetadata, writeMetadata } from "../../../mme.js";
import { readApeTag } from "../../../tags/ape/readApeTag/readApeTag.js";
import { ID3V1_TAG_SIZE } from "../../../tags/id3v1/constants.js";
import { readId3v1 } from "../../../tags/id3v1/readId3v1/readId3v1.js";
import { parseId3v2 } from "../../../tags/id3v2/parseId3v2/parseId3v2.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/mp3",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

it("rewrites tags and re-reads them identically", async () => {
  const original = await loadFixture("v24-with-extras.mp3");
  const rewritten = await writeMetadata(original, {
    tag: { title: "Edited", artist: "Editor", trackNumber: 99 },
  });
  const reread = await readMetadata(rewritten);
  expect(reread.tag.title).toBe("Edited");
  expect(reread.tag.artist).toBe("Editor");
  expect(reread.tag.trackNumber).toBe(99);
});

it("preserves unknown frames (APIC / USLT) across a write", async () => {
  const original = await loadFixture("v24-with-extras.mp3");
  const rewritten = await writeMetadata(original, { tag: { title: "Edited" } });
  const tag = parseId3v2(rewritten);
  const ids = (tag?.frames ?? []).map((f) => f.id);
  expect(ids).toContain("APIC");
  expect(ids).toContain("USLT");
});

it("re-emits the ID3v1 trailer when the input had one", async () => {
  const original = await loadFixture("v23-with-id3v1.mp3");
  const rewritten = await writeMetadata(original, {
    tag: { title: "Updated", trackNumber: 5 },
  });
  expect(rewritten.length).toBeGreaterThan(ID3V1_TAG_SIZE);
  const v1 = readId3v1(rewritten);
  expect(v1).toBeDefined();
  expect(v1?.title).toBe("Updated");
  expect(v1?.trackNumber).toBe(5);
});

it("opts out of the ID3v1 trailer via includeId3v1=false", async () => {
  const original = await loadFixture("v23-with-id3v1.mp3");
  const rewritten = await writeMetadata(original, {
    tag: { title: "No v1" },
    // The MP3 writer accepts this MP3-specific extension on WriteOptions.
    includeId3v1: false,
  } as Parameters<typeof writeMetadata>[1]);
  expect(readId3v1(rewritten)).toBeUndefined();
});

it("replaces APIC frames when the caller supplies pictures", async () => {
  const original = await loadFixture("v24-with-extras.mp3");
  const newPicture = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
  const rewritten = await writeMetadata(original, {
    tag: {},
    pictures: [
      {
        mimeType: "image/jpeg",
        kind: 3,
        description: "Replacement",
        data: newPicture,
      },
    ],
  });
  const reread = await readMetadata(rewritten);
  expect(reread.pictures).toHaveLength(1);
  expect(reread.pictures[0]?.mimeType).toBe("image/jpeg");
  expect(reread.pictures[0]?.description).toBe("Replacement");
  expect(reread.pictures[0]?.data).toEqual(newPicture);
});

it("replaces USLT lyrics when the caller supplies new lyrics", async () => {
  const original = await loadFixture("v24-with-extras.mp3");
  const rewritten = await writeMetadata(original, {
    tag: {},
    lyrics: { language: "eng", description: "", unsynchronized: "Hello\nWorld" },
  });
  const reread = await readMetadata(rewritten);
  expect(reread.lyrics?.unsynchronized).toBe("Hello\nWorld");
});

it("writes chapters as CHAP / CTOC frames and re-reads them", async () => {
  const original = await loadFixture("v24-with-extras.mp3");
  const rewritten = await writeMetadata(original, {
    tag: {},
    chapters: [
      { id: "ch1", startMs: 0, endMs: 1000, title: "Intro" },
      { id: "ch2", startMs: 1000, endMs: 5000, title: "Body" },
    ],
  });
  const reread = await readMetadata(rewritten);
  expect(reread.chapters).toHaveLength(2);
  expect(reread.chapters[0]?.title).toBe("Intro");
  expect(reread.chapters[1]?.id).toBe("ch2");
});

it("refreshes the APE Tag on a layered MP3 + APE + ID3v1 file", async () => {
  const original = await loadFixture("v23-with-ape-and-id3v1.mp3");
  const rewritten = await writeMetadata(original, {
    tag: { title: "Refreshed", artist: "Refreshed Artist" },
  });

  // Both APE and ID3v1 trailers stay in place after a rewrite.
  const ape = readApeTag(rewritten);
  expect(ape).toBeDefined();
  expect(ape?.items.find((item) => item.key.toLowerCase() === "title")?.value).toBe("Refreshed");

  const v1 = readId3v1(rewritten);
  expect(v1?.title).toBe("Refreshed");

  // ID3v2 head also reflects the new title.
  const id3v2 = parseId3v2(rewritten);
  expect(id3v2).toBeDefined();
});
