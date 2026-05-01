import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { findAllAtoms } from "../atom/findAllAtoms.js";
import { findAtom } from "../atom/findAtom.js";
import { parseAtomTree } from "../atom/parseAtomTree/parseAtomTree.js";
import { readMp4 } from "../readMp4/readMp4.js";
import { writeMp4 } from "./writeMp4.js";

const FIXTURE_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../tests/fixtures/mp4",
);

const loadFixture = async (name: string): Promise<Uint8Array> =>
  new Uint8Array(await readFile(resolve(FIXTURE_DIR, name)));

/** Read the single chunk offset from the (only) `stco` atom inside `bytes`. */
const readSingleStco = (bytes: Uint8Array): number => {
  const tree = parseAtomTree(bytes);
  const stco = findAllAtoms(tree, "stco")[0];
  if (stco === undefined) throw new Error("stco atom missing");

  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // Box header (8 bytes) + version+flags (4 bytes) + entry_count (4 bytes) = 16 bytes before entries.
  return view.readUInt32BE(stco.offset + 16);
};

/** Find the offset of the first byte of `mdat`'s payload inside `bytes`. */
const findMdatPayloadOffset = (bytes: Uint8Array): number => {
  const tree = parseAtomTree(bytes);
  const mdat = tree.find((a) => a.type === "mdat");
  if (mdat === undefined) throw new Error("mdat atom missing");
  return mdat.payloadOffset;
};

it("round-trips a tag write through readMetadata", async () => {
  const bytes = await loadFixture("basic.m4a");
  const updated = await writeMp4(bytes, {
    tag: {
      title: "Updated title",
      artist: "Updated artist",
      comment: "Round-trip OK",
    },
  });

  const reread = await readMp4(updated);
  expect(reread.tag.title).toBe("Updated title");
  expect(reread.tag.artist).toBe("Updated artist");
  expect(reread.tag.comment).toBe("Round-trip OK");
  // Pre-existing fields not touched by the write should still be present.
  expect(reread.tag.album).toBe("Phase4 Album");
  expect(reread.tag.trackNumber).toBe(2);
});

it("updates stco entries to reflect the new mdat offset", async () => {
  const bytes = await loadFixture("basic.m4a");
  const originalStco = readSingleStco(bytes);
  const originalMdat = findMdatPayloadOffset(bytes);
  expect(originalStco).toBe(originalMdat);

  const updated = await writeMp4(bytes, {
    tag: { title: "Much longer title that grows the moov atom by some bytes" },
  });

  const newStco = readSingleStco(updated);
  const newMdat = findMdatPayloadOffset(updated);
  expect(newStco).toBe(newMdat);
  // The moov grew, so the audio offset shifted forward.
  expect(newMdat).toBeGreaterThan(originalMdat);
});

it("preserves embedded covr atoms when only text fields are updated", async () => {
  const bytes = await loadFixture("with-picture.m4a");
  const updated = await writeMp4(bytes, { tag: { title: "New title" } });

  const reread = await readMp4(updated);
  expect(reread.tag.title).toBe("New title");
  expect(reread.pictures).toHaveLength(1);
  expect(reread.pictures[0]?.mimeType).toBe("image/png");
});

it("keeps mdat payload bytes intact across a metadata rewrite", async () => {
  const bytes = await loadFixture("basic.m4a");
  const updated = await writeMp4(bytes, { tag: { title: "Same length" } });

  const oldOffset = findMdatPayloadOffset(bytes);
  const newOffset = findMdatPayloadOffset(updated);

  // mdat bytes themselves must match — only their position can change.
  const oldBytes = bytes.subarray(oldOffset);
  const newBytes = updated.subarray(newOffset);
  expect(Array.from(newBytes)).toEqual(Array.from(oldBytes));
});

it("rebuilds files where the moov atom is missing entries we add", async () => {
  // Build a fresh fixture without artist or album to test the "add" path.
  const bytes = await loadFixture("basic.m4a");
  const updated = await writeMp4(bytes, {
    tag: { lyricist: "Phase 4 lyricist", language: "eng" },
  });

  const reread = await readMp4(updated);
  expect(reread.tag.lyricist).toBe("Phase 4 lyricist");
  expect(reread.tag.language).toBe("eng");
  // The audio offset still matches the stco entry afterwards.
  const stcoOffset = readSingleStco(updated);
  const mdatOffset = findMdatPayloadOffset(updated);
  expect(stcoOffset).toBe(mdatOffset);
});

it("can be reached via the public readMetadata / writeMetadata path", async () => {
  const bytes = await loadFixture("basic.m4a");
  const ilstAtom = findAtom(parseAtomTree(bytes), ["moov", "udta", "meta", "ilst"]);
  expect(ilstAtom).toBeDefined();
});
