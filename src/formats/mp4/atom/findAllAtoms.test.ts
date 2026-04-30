import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { findAllAtoms } from "./findAllAtoms.js";
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

it("collects every atom of a given type via depth-first traversal", () => {
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
