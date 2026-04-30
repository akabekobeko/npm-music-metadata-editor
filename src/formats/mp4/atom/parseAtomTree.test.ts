import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { findAllAtoms } from "./findAllAtoms.js";
import { findAtom } from "./findAtom.js";
import { parseAtomTree } from "./parseAtomTree.js";

/**
 * Build a single atom (`size + type + payload`) for the test fixtures below.
 */
const atom = (type: string, payload: Uint8Array | Buffer = Buffer.alloc(0)): Buffer => {
  const size = 8 + payload.length;
  const out = Buffer.alloc(size);
  out.writeUInt32BE(size, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, 8);
  return out;
};

describe("parseAtomTree", () => {
  it("parses a flat sequence of leaf atoms", () => {
    const ftyp = atom("ftyp", Buffer.from("M4A mp42isom", "latin1"));
    const mdat = atom("mdat", Buffer.from([0x01, 0x02, 0x03]));
    const buffer = Buffer.concat([ftyp, mdat]);

    const tree = parseAtomTree(buffer);

    expect(tree).toHaveLength(2);
    expect(tree[0]?.type).toBe("ftyp");
    expect(tree[0]?.size).toBe(ftyp.length);
    expect(tree[0]?.payloadSize).toBe(ftyp.length - 8);
    expect(tree[0]?.children).toBeUndefined();
    expect(tree[1]?.type).toBe("mdat");
    expect(tree[1]?.offset).toBe(ftyp.length);
  });

  it("recurses into container atoms", () => {
    const inner = atom("mvhd", Buffer.alloc(4));
    const moov = atom("moov", inner);
    const tree = parseAtomTree(moov);

    expect(tree).toHaveLength(1);
    expect(tree[0]?.type).toBe("moov");
    expect(tree[0]?.children).toHaveLength(1);
    expect(tree[0]?.children?.[0]?.type).toBe("mvhd");
    expect(tree[0]?.children?.[0]?.offset).toBe(8);
  });

  it("recognises ilst children as containers of data atoms", () => {
    const dataAtom = atom(
      "data",
      Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x01]), // type indicator (UTF-8)
        Buffer.from([0x00, 0x00, 0x00, 0x00]), // locale
        Buffer.from("hello", "utf8"),
      ]),
    );
    const titleAtom = atom("©nam", dataAtom);
    const ilst = atom("ilst", titleAtom);
    const tree = parseAtomTree(ilst);

    const ilstAtom = tree[0];
    expect(ilstAtom?.children).toHaveLength(1);
    const titleParsed = ilstAtom?.children?.[0];
    expect(titleParsed?.type).toBe("©nam");
    expect(titleParsed?.children).toHaveLength(1);
    expect(titleParsed?.children?.[0]?.type).toBe("data");
  });

  it("handles meta atoms with a version+flags prefix", () => {
    const ilstChild = atom("ilst");
    const metaPayload = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x00]), // version + flags
      ilstChild,
    ]);
    const meta = atom("meta", metaPayload);

    const tree = parseAtomTree(meta);
    const metaAtom = tree[0];
    expect(metaAtom?.children).toHaveLength(1);
    expect(metaAtom?.children?.[0]?.type).toBe("ilst");
  });

  it("handles meta atoms without a version+flags prefix", () => {
    const ilstChild = atom("ilst");
    // QuickTime variant: payload begins with a child atom directly.
    const meta = atom("meta", ilstChild);

    const tree = parseAtomTree(meta);
    const metaAtom = tree[0];
    expect(metaAtom?.children).toHaveLength(1);
    expect(metaAtom?.children?.[0]?.type).toBe("ilst");
    expect(metaAtom?.children?.[0]?.offset).toBe(metaAtom?.payloadOffset);
  });

  it("supports the 64-bit extended size form", () => {
    const payload = Buffer.from([0xaa, 0xbb]);
    const totalSize = 16 + payload.length; // 16-byte header + payload
    const out = Buffer.alloc(totalSize);
    out.writeUInt32BE(1, 0); // size = 1 → use largesize
    out.write("free", 4, 4, "latin1");
    out.writeBigUInt64BE(BigInt(totalSize), 8);
    payload.copy(out, 16);

    const tree = parseAtomTree(out);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.type).toBe("free");
    expect(tree[0]?.headerSize).toBe(16);
    expect(tree[0]?.payloadSize).toBe(payload.length);
  });

  it("throws when a child atom would extend past its parent", () => {
    // A moov that claims size 16 but contains a child that claims size 32.
    const out = Buffer.alloc(16);
    out.writeUInt32BE(16, 0);
    out.write("moov", 4, 4, "latin1");
    out.writeUInt32BE(32, 8);
    out.write("mvhd", 12, 4, "latin1");

    expect(() => parseAtomTree(out)).toThrow(/extends past parent end/);
  });
});

describe("findAtom", () => {
  it("walks a path of nested atom types", () => {
    const ilst = atom("ilst");
    const meta = atom("meta", Buffer.concat([Buffer.from([0, 0, 0, 0]), ilst]));
    const udta = atom("udta", meta);
    const moov = atom("moov", udta);

    const tree = parseAtomTree(moov);
    const found = findAtom(tree, ["moov", "udta", "meta", "ilst"]);
    expect(found?.type).toBe("ilst");
  });

  it("returns undefined when a path segment is missing", () => {
    const moov = atom("moov", atom("mvhd"));
    const tree = parseAtomTree(moov);
    expect(findAtom(tree, ["moov", "udta"])).toBeUndefined();
    expect(findAtom(tree, [])).toBeUndefined();
  });

  it("collects all atoms of a given type via findAllAtoms", () => {
    const trak1 = atom(
      "trak",
      atom("mdia", atom("minf", atom("stbl", atom("stco", Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]))))),
    );
    const trak2 = atom(
      "trak",
      atom("mdia", atom("minf", atom("stbl", atom("stco", Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]))))),
    );
    const moov = atom("moov", Buffer.concat([trak1, trak2]));

    const tree = parseAtomTree(moov);
    expect(findAllAtoms(tree, "stco")).toHaveLength(2);
    expect(findAllAtoms(tree, "trak")).toHaveLength(2);
    expect(findAllAtoms(tree, "co64")).toHaveLength(0);
  });
});
