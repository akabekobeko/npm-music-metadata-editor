import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readMetadata, writeMetadata } from "../../mme.js";
import { ID3V1_TAG_SIZE } from "../../tags/id3v1/constants.js";
import { readId3v1 } from "../../tags/id3v1/readId3v1.js";
import { readId3v2 } from "../../tags/id3v2/readId3v2.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../tests/fixtures/mp3",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

describe("MP3 readMetadata", () => {
  it("reads ID3v2.3 fixture", async () => {
    const bytes = await loadFixture("v23-basic.mp3");
    const result = await readMetadata(bytes);
    expect(result.audioFormat).toBe("mp3");
    expect(result.tag).toMatchObject({
      title: "v23 basic",
      artist: "Tester",
      album: "Phase2 Album",
      trackNumber: 1,
      trackTotal: 12,
      year: 2024,
      comment: "ID3v2.3 sample",
    });
  });

  it("reads ID3v2.4 fixture with extras", async () => {
    const bytes = await loadFixture("v24-with-extras.mp3");
    const result = await readMetadata(bytes);
    expect(result.tag).toMatchObject({
      title: "v24 extras",
      artist: "Tester",
      album: "Phase2 Album",
      trackNumber: 3,
      trackTotal: 9,
      discNumber: 1,
      discTotal: 2,
      recordingDate: "2024-04-01",
      bpm: 120,
      comment: "ID3v2.4 sample",
    });
    // APIC / USLT structuring is Phase 9; pictures / lyrics stay empty here.
    expect(result.pictures).toEqual([]);
    expect(result.lyrics).toBeUndefined();
  });

  it("reads ID3v2 head while ID3v1 trailer is also present", async () => {
    const bytes = await loadFixture("v23-with-id3v1.mp3");
    const result = await readMetadata(bytes);
    // ID3v2 wins on overlapping fields, ID3v1 fills the rest.
    expect(result.tag.title).toBe("Both tags");
    expect(result.tag.artist).toBe("Tester");
    // Track / year only exist in the ID3v1 trailer for this fixture.
    expect(result.tag.trackNumber).toBe(7);
    expect(result.tag.year).toBe(2024);
  });
});

describe("MP3 writeMetadata round-trip", () => {
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
    const tag = readId3v2(rewritten);
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

  it("can opt out of the ID3v1 trailer via includeId3v1=false", async () => {
    const original = await loadFixture("v23-with-id3v1.mp3");
    const rewritten = await writeMetadata(original, {
      tag: { title: "No v1" },
      // The MP3 writer accepts this MP3-specific extension on WriteOptions.
      includeId3v1: false,
    } as Parameters<typeof writeMetadata>[1]);
    expect(readId3v1(rewritten)).toBeUndefined();
  });
});
