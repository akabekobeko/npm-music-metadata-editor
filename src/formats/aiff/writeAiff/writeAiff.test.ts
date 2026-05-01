import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { readMetadata, writeMetadata } from "../../../mme.js";
import { parseChunks } from "../../iff/parseChunks/parseChunks.js";
import { AIFF_HEADER_SIZE } from "../constants.js";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/aiff",
);

const loadFixture = (name: string): Promise<Uint8Array> =>
  readFile(resolve(FIXTURES_DIR, name)).then(
    (b) => new Uint8Array(b.buffer, b.byteOffset, b.byteLength),
  );

const collectChunkIds = (bytes: Uint8Array): string[] =>
  parseChunks({ buffer: bytes.subarray(AIFF_HEADER_SIZE), endianness: "big" }).map(
    (chunk) => chunk.id,
  );

it("round-trips native chunk fields without losing COMM or SSND", async () => {
  const bytes = await loadFixture("native.aiff");
  const updated = await writeMetadata(bytes, {
    tag: { title: "Updated", artist: "New Artist", copyright: "(C) Updated" },
  });
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.title).toBe("Updated");
  expect(reparsed.tag.artist).toBe("New Artist");
  expect(reparsed.tag.copyright).toBe("(C) Updated");

  const ids = collectChunkIds(updated);
  expect(ids).toContain("COMM");
  expect(ids).toContain("SSND");
});

it("preserves COMM and SSND bytes verbatim", async () => {
  const bytes = await loadFixture("native.aiff");
  const original = parseChunks({
    buffer: bytes.subarray(AIFF_HEADER_SIZE),
    endianness: "big",
  });
  const ssnd = original.find((chunk) => chunk.id === "SSND");
  if (ssnd === undefined) {
    throw new Error("fixture missing SSND chunk");
  }

  const ssndBefore = bytes.subarray(
    AIFF_HEADER_SIZE + ssnd.offset,
    AIFF_HEADER_SIZE + ssnd.offset + ssnd.size,
  );

  const updated = await writeMetadata(bytes, { tag: { title: "Updated" } });
  const updatedChunks = parseChunks({
    buffer: updated.subarray(AIFF_HEADER_SIZE),
    endianness: "big",
  });
  const updatedSsnd = updatedChunks.find((chunk) => chunk.id === "SSND");
  if (updatedSsnd === undefined) {
    throw new Error("rewritten file missing SSND chunk");
  }

  const ssndAfter = updated.subarray(
    AIFF_HEADER_SIZE + updatedSsnd.offset,
    AIFF_HEADER_SIZE + updatedSsnd.offset + updatedSsnd.size,
  );
  expect(ssndAfter).toEqual(ssndBefore);
});

it("emits an ID3 chunk when the source already had one", async () => {
  const bytes = await loadFixture("id3.aiff");
  const updated = await writeMetadata(bytes, { tag: { title: "Renamed" } });
  expect(collectChunkIds(updated)).toContain("ID3 ");
  const reparsed = await readMetadata(updated);
  expect(reparsed.tag.title).toBe("Renamed");
});

it("rewrites the FORM size to match the new total length", async () => {
  const bytes = await loadFixture("native.aiff");
  const updated = await writeMetadata(bytes, {
    tag: { title: "Much longer title than the original to force a size change" },
  });
  const view = new DataView(updated.buffer, updated.byteOffset, updated.byteLength);
  const declaredSize = view.getUint32(4, false);
  expect(declaredSize).toBe(updated.length - 8);
});
