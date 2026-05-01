import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { parseAtomTree } from "../../atom/parseAtomTree/parseAtomTree.js";
import { atomsToTagFields } from "../atomsToTagFields/atomsToTagFields.js";
import { readIlst } from "../readIlst/readIlst.js";
import { tagToItunesAtoms } from "../tagToItunesAtoms/tagToItunesAtoms.js";
import { writeIlst } from "./writeIlst.js";

/** Wrap the writer's payload bytes in an ilst box so it can be re-parsed. */
const wrapInIlst = (payload: Uint8Array): Buffer => {
  const out = Buffer.alloc(8 + payload.length);
  out.writeUInt32BE(out.length, 0);
  out.write("ilst", 4, 4, "latin1");
  Buffer.from(payload).copy(out, 8);
  return out;
};

it("emits a payload that round-trips back to the same TagData", () => {
  const built = tagToItunesAtoms({
    tag: {
      title: "Hello",
      artist: "Tester",
      album: "Album",
      trackNumber: 5,
      trackTotal: 12,
      discNumber: 1,
      discTotal: 2,
      bpm: 120,
      recordingDate: "2025-04-30",
    },
  });
  const ilst = wrapInIlst(writeIlst(built));
  const tree = parseAtomTree(ilst);
  const root = tree[0];
  if (root === undefined) throw new Error("missing ilst");
  const items = readIlst({ source: ilst, ilst: root });
  const { tag } = atomsToTagFields(items);

  expect(tag.title).toBe("Hello");
  expect(tag.artist).toBe("Tester");
  expect(tag.album).toBe("Album");
  expect(tag.trackNumber).toBe(5);
  expect(tag.trackTotal).toBe(12);
  expect(tag.discNumber).toBe(1);
  expect(tag.discTotal).toBe(2);
  expect(tag.bpm).toBe(120);
  expect(tag.recordingDate).toBe("2025-04-30");
  expect(tag.year).toBe(2025);
});

it("preserves freeform LYRICIST values across a round-trip", () => {
  const built = tagToItunesAtoms({ tag: { lyricist: "Someone" } });
  const ilst = wrapInIlst(writeIlst(built));
  const tree = parseAtomTree(ilst);
  const root = tree[0];
  if (root === undefined) throw new Error("missing ilst");
  const items = readIlst({ source: ilst, ilst: root });
  const { tag } = atomsToTagFields(items);

  expect(tag.lyricist).toBe("Someone");
});
