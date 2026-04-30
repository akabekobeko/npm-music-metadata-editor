import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { parseAtomTree } from "../atom/parseAtomTree.js";
import { ItunesDataType } from "../constants.js";
import { atomsToTagFields } from "./atomToTagField.js";
import { readIlst } from "./readIlst.js";
import { tagToItunesAtoms } from "./tagFieldToAtom.js";
import { writeIlstPayload } from "./writeIlst.js";

/** Build a single atom (`size + type + payload`). */
const atom = (type: string, payload: Uint8Array | Buffer = Buffer.alloc(0)): Buffer => {
  const out = Buffer.alloc(8 + payload.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, 8);
  return out;
};

/** Build a `data` atom with a UTF-8 string payload. */
const utf8Data = (text: string): Buffer => {
  const inner = Buffer.alloc(8 + Buffer.byteLength(text, "utf8"));
  inner.writeUInt32BE(ItunesDataType.Utf8, 0);
  inner.writeUInt32BE(0, 4);
  inner.write(text, 8, "utf8");
  return atom("data", inner);
};

/** Build a `data` atom carrying a `trkn`-style number+total payload. */
const trknData = (number: number, total: number): Buffer => {
  const inner = Buffer.alloc(8 + 8);
  inner.writeUInt32BE(0, 0);
  inner.writeUInt32BE(0, 4);
  inner.writeUInt16BE(0, 8);
  inner.writeUInt16BE(number, 10);
  inner.writeUInt16BE(total, 12);
  return atom("data", inner);
};

describe("readIlst + atomsToTagFields", () => {
  it("decodes the canonical iTunes atoms into TagData", () => {
    const ilst = atom(
      "ilst",
      Buffer.concat([
        atom("©nam", utf8Data("Hello")),
        atom("©ART", utf8Data("Tester")),
        atom("©alb", utf8Data("Album")),
        atom("trkn", trknData(3, 12)),
      ]),
    );
    const tree = parseAtomTree(ilst);
    const root = tree[0];
    if (root === undefined) throw new Error("missing ilst");
    const items = readIlst({ source: ilst, ilst: root });
    const { tag } = atomsToTagFields(items);

    expect(tag.title).toBe("Hello");
    expect(tag.artist).toBe("Tester");
    expect(tag.album).toBe("Album");
    expect(tag.trackNumber).toBe(3);
    expect(tag.trackTotal).toBe(12);
  });

  it("decodes covr atoms into pictures", () => {
    const png = Buffer.from([1, 2, 3]);
    const covrPayload = Buffer.alloc(8 + png.length);
    covrPayload.writeUInt32BE(ItunesDataType.Png, 0);
    covrPayload.writeUInt32BE(0, 4);
    png.copy(covrPayload, 8);
    const ilst = atom("ilst", atom("covr", atom("data", covrPayload)));
    const tree = parseAtomTree(ilst);
    const root = tree[0];
    if (root === undefined) throw new Error("missing ilst");
    const items = readIlst({ source: ilst, ilst: root });
    const { pictures } = atomsToTagFields(items);

    expect(pictures).toHaveLength(1);
    expect(pictures[0]?.mimeType).toBe("image/png");
    expect(Array.from(pictures[0]?.data ?? [])).toEqual([1, 2, 3]);
  });
});

describe("tagToItunesAtoms + writeIlstPayload round-trip", () => {
  it("emits bytes that parse back to the same tag", () => {
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
    const payload = writeIlstPayload(built);
    const ilst = atom("ilst", Buffer.from(payload));
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

  it("preserves freeform LYRICIST values", () => {
    const built = tagToItunesAtoms({ tag: { lyricist: "Someone" } });
    const payload = writeIlstPayload(built);
    const ilst = atom("ilst", Buffer.from(payload));
    const tree = parseAtomTree(ilst);
    const root = tree[0];
    if (root === undefined) throw new Error("missing ilst");
    const items = readIlst({ source: ilst, ilst: root });
    const { tag } = atomsToTagFields(items);

    expect(tag.lyricist).toBe("Someone");
  });
});
