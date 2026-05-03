import { Buffer } from "node:buffer";
import { BOX_HEADER_SIZE } from "../constants.js";

/**
 * Build a single atom (`size + type + payload`).
 *
 * @param type - 4-character atom type (Latin-1).
 * @param payload - Atom payload bytes.
 * @returns The encoded box including its 8-byte header.
 */
export const buildAtom = (type: string, payload: Uint8Array): Uint8Array => {
  const out = Buffer.alloc(BOX_HEADER_SIZE + payload.length);
  out.writeUInt32BE(out.length, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, BOX_HEADER_SIZE);
  return new Uint8Array(out);
};
