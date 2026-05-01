import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { readMetadata, writeMetadata } from "../../../mme.js";
import { parseChunks } from "../../iff/parseChunks/parseChunks.js";
import { WAV_HEADER_SIZE } from "../constants.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/wav",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

const collectChunkIds = (bytes: Uint8Array): string[] =>
  parseChunks({ buffer: bytes.subarray(WAV_HEADER_SIZE), endianness: "little" }).map(
    (chunk) => chunk.id,
  );

it("round-trips LIST/INFO fields without losing fmt or data", async () => {
  const bytes = await loadFixture("list-info.wav");
  const updated = await writeMetadata(bytes, {
    tag: { title: "Updated", artist: "New Artist", year: 1999 },
  });
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.title).toBe("Updated");
  expect(reparsed.tag.artist).toBe("New Artist");
  expect(reparsed.tag.year).toBe(1999);

  const ids = collectChunkIds(updated);
  expect(ids).toContain("fmt ");
  expect(ids).toContain("data");
  expect(ids).toContain("LIST");
});

it("preserves the original fmt + data bytes verbatim", async () => {
  const bytes = await loadFixture("list-info.wav");
  const original = parseChunks({
    buffer: bytes.subarray(WAV_HEADER_SIZE),
    endianness: "little",
  });
  const dataChunk = original.find((chunk) => chunk.id === "data");
  if (dataChunk === undefined) {
    throw new Error("fixture missing data chunk");
  }

  const dataBefore = bytes.subarray(
    WAV_HEADER_SIZE + dataChunk.offset,
    WAV_HEADER_SIZE + dataChunk.offset + dataChunk.size,
  );

  const updated = await writeMetadata(bytes, { tag: { title: "Updated" } });
  const updatedChunks = parseChunks({
    buffer: updated.subarray(WAV_HEADER_SIZE),
    endianness: "little",
  });
  const updatedData = updatedChunks.find((chunk) => chunk.id === "data");
  if (updatedData === undefined) {
    throw new Error("rewritten file missing data chunk");
  }

  const dataAfter = updated.subarray(
    WAV_HEADER_SIZE + updatedData.offset,
    WAV_HEADER_SIZE + updatedData.offset + updatedData.size,
  );
  expect(dataAfter).toEqual(dataBefore);
});

it("emits an id3 chunk when the source already had one", async () => {
  const bytes = await loadFixture("id3.wav");
  const updated = await writeMetadata(bytes, { tag: { title: "Renamed" } });
  expect(collectChunkIds(updated)).toContain("id3 ");
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.title).toBe("Renamed");
});

it("creates an id3 chunk on a LIST/INFO-only file when the caller writes tag fields", async () => {
  const bytes = await loadFixture("list-info.wav");
  const updated = await writeMetadata(bytes, { tag: { title: "Hello" } });
  // Even the LIST/INFO-only fixture grows an id3 chunk because the writer
  // emits one whenever tag fields are present, ensuring DAWs that prefer
  // ID3 see the same value.
  expect(collectChunkIds(updated)).toEqual(expect.arrayContaining(["LIST", "id3 "]));
});

it("rewrites the RIFF size to match the new total length", async () => {
  const bytes = await loadFixture("list-info.wav");
  const updated = await writeMetadata(bytes, {
    tag: { title: "Much longer title than the original to force a size change" },
  });
  const view = new DataView(updated.buffer, updated.byteOffset, updated.byteLength);
  const declaredSize = view.getUint32(4, true);
  expect(declaredSize).toBe(updated.length - 8);
});
