import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { findAtom } from "./findAtom.js";
import { parseAtomTree } from "./parseAtomTree.js";

/** Build a single atom (`size + type + payload`). */
const atom = (type: string, payload: Uint8Array | Buffer = Buffer.alloc(0)): Buffer => {
  const size = 8 + payload.length;
  const out = Buffer.alloc(size);
  out.writeUInt32BE(size, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, 8);
  return out;
};

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
