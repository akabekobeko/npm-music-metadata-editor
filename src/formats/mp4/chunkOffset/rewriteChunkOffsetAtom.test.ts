import { Buffer } from "node:buffer";
import { expect, it } from "vitest";
import { parseAtomTree } from "../atom/parseAtomTree/parseAtomTree.js";
import { rewriteChunkOffsetAtom } from "./rewriteChunkOffsetAtom.js";

/** Build a single atom (`size + type + payload`). */
const atom = (type: string, payload: Buffer): Buffer => {
  const out = Buffer.alloc(8 + payload.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 4, "latin1");
  payload.copy(out, 8);
  return out;
};

/** Build an `stco` atom with the given 32-bit chunk offset entries. */
const stcoAtom = (offsets: readonly number[]): Buffer => {
  const payload = Buffer.alloc(8 + offsets.length * 4);
  payload.writeUInt32BE(0, 0); // version + flags
  payload.writeUInt32BE(offsets.length, 4);
  for (let i = 0; i < offsets.length; i++) {
    payload.writeUInt32BE(offsets[i] ?? 0, 8 + i * 4);
  }

  return atom("stco", payload);
};

/** Build a `co64` atom with the given 64-bit chunk offset entries. */
const co64Atom = (offsets: readonly bigint[]): Buffer => {
  const payload = Buffer.alloc(8 + offsets.length * 8);
  payload.writeUInt32BE(0, 0);
  payload.writeUInt32BE(offsets.length, 4);
  for (let i = 0; i < offsets.length; i++) {
    payload.writeBigUInt64BE(offsets[i] ?? 0n, 8 + i * 8);
  }

  return atom("co64", payload);
};

it("rewrites a 32-bit stco atom in place", () => {
  const buf = stcoAtom([0x100, 0x200, 0x300]);
  const tree = parseAtomTree(buf);
  const root = tree[0];
  if (root === undefined) throw new Error("missing root atom");
  const out = rewriteChunkOffsetAtom({
    source: buf,
    atom: root,
    remap: (offset) => offset + 0x10,
  });

  // Box header (size + type) preserved.
  expect(out.length).toBe(buf.length);
  expect(Array.from(out.subarray(0, 8))).toEqual(Array.from(buf.subarray(0, 8)));

  // Decode entries from the rewritten payload.
  const view = Buffer.from(out.buffer, out.byteOffset, out.byteLength);
  expect(view.readUInt32BE(8 + 8 + 0)).toBe(0x110);
  expect(view.readUInt32BE(8 + 8 + 4)).toBe(0x210);
  expect(view.readUInt32BE(8 + 8 + 8)).toBe(0x310);
});

it("rewrites a 64-bit co64 atom", () => {
  const buf = co64Atom([0x100n, 0x100000000n]);
  const tree = parseAtomTree(buf);
  const root = tree[0];
  if (root === undefined) throw new Error("missing root atom");
  const out = rewriteChunkOffsetAtom({
    source: buf,
    atom: root,
    remap: (offset) => offset + 0x20,
  });
  const view = Buffer.from(out.buffer, out.byteOffset, out.byteLength);
  expect(view.readBigUInt64BE(8 + 8 + 0)).toBe(0x120n);
  expect(view.readBigUInt64BE(8 + 8 + 8)).toBe(0x100000020n);
});

it("rejects offsets that no longer fit in 32 bits for stco", () => {
  const buf = stcoAtom([0xfffffff0]);
  const tree = parseAtomTree(buf);
  const root = tree[0];
  if (root === undefined) throw new Error("missing root atom");
  expect(() =>
    rewriteChunkOffsetAtom({
      source: buf,
      atom: root,
      remap: () => 0x100000000,
    }),
  ).toThrow(/does not fit in 32 bits/);
});
