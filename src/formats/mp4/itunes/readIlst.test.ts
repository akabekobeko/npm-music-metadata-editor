import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { parseAtomTree } from "../atom/parseAtomTree.js";
import { ItunesDataType } from "../constants.js";
import { readIlst } from "./readIlst.js";

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

/** Build a `data` atom carrying a `trkn`-style 8-byte payload. */
const trknData = (number: number, total: number): Buffer => {
  const inner = Buffer.alloc(8 + 8);
  inner.writeUInt32BE(0, 0);
  inner.writeUInt32BE(0, 4);
  inner.writeUInt16BE(0, 8);
  inner.writeUInt16BE(number, 10);
  inner.writeUInt16BE(total, 12);
  return atom("data", inner);
};

it("returns one ItunesAtom per ilst child, with decoded data values", () => {
  const ilst = atom(
    "ilst",
    Buffer.concat([atom("©nam", utf8Data("Hello")), atom("trkn", trknData(3, 12))]),
  );
  const tree = parseAtomTree(ilst);
  const root = tree[0];
  if (root === undefined) throw new Error("missing ilst");

  const items = readIlst({ source: ilst, ilst: root });

  expect(items.map((a) => a.name)).toEqual(["©nam", "trkn"]);
  expect(items[0]?.values).toHaveLength(1);
  expect(items[0]?.values[0]?.typeIndicator).toBe(ItunesDataType.Utf8);
  expect(items[1]?.values[0]?.typeIndicator).toBe(ItunesDataType.Implicit);
});

it("captures multiple data atoms inside a single ilst entry", () => {
  // `covr` may carry multiple data atoms (one per embedded image).
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const data1 = Buffer.alloc(8 + png.length);
  data1.writeUInt32BE(ItunesDataType.Png, 0);
  data1.writeUInt32BE(0, 4);
  png.copy(data1, 8);
  const data2 = Buffer.alloc(8 + png.length);
  data2.writeUInt32BE(ItunesDataType.Jpeg, 0);
  data2.writeUInt32BE(0, 4);
  png.copy(data2, 8);
  const ilst = atom(
    "ilst",
    atom("covr", Buffer.concat([atom("data", data1), atom("data", data2)])),
  );
  const tree = parseAtomTree(ilst);
  const root = tree[0];
  if (root === undefined) throw new Error("missing ilst");

  const items = readIlst({ source: ilst, ilst: root });

  expect(items[0]?.values).toHaveLength(2);
  expect(items[0]?.values[0]?.typeIndicator).toBe(ItunesDataType.Png);
  expect(items[0]?.values[1]?.typeIndicator).toBe(ItunesDataType.Jpeg);
});

it("surfaces freeform `mean` / `name` strings on `----` atoms", () => {
  const meanPayload = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from("com.apple.iTunes")]);
  const namePayload = Buffer.concat([Buffer.from([0, 0, 0, 0]), Buffer.from("LYRICIST")]);
  const freeform = atom(
    "----",
    Buffer.concat([atom("mean", meanPayload), atom("name", namePayload), utf8Data("Tester")]),
  );
  const ilst = atom("ilst", freeform);
  const tree = parseAtomTree(ilst);
  const root = tree[0];
  if (root === undefined) throw new Error("missing ilst");

  const items = readIlst({ source: ilst, ilst: root });

  expect(items[0]?.name).toBe("----");
  expect(items[0]?.meanNamespace).toBe("com.apple.iTunes");
  expect(items[0]?.meanName).toBe("LYRICIST");
  expect(items[0]?.values).toHaveLength(1);
});
