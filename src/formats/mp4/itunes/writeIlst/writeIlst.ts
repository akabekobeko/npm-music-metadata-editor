import { Buffer } from "node:buffer";
import type { ItunesAtom } from "../../types.js";
import { writeItunesAtom } from "./writeItunesAtom.js";

/**
 * Serialize the contents of an `ilst` atom (children only, *not* including
 * the `ilst` box header itself).
 *
 * @param atoms - The structured atom list to encode.
 * @returns The serialized payload bytes.
 */
export const writeIlst = (atoms: readonly ItunesAtom[]): Uint8Array => {
  const parts = atoms.map(writeItunesAtom);
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = Buffer.alloc(total);
  let offset = 0;
  for (const part of parts) {
    Buffer.from(part).copy(out, offset);
    offset += part.length;
  }

  return new Uint8Array(out);
};
