import { Buffer } from "node:buffer";
import { BOX_HEADER_SIZE } from "../../constants.js";

/**
 * Write a single atom as `size + type + payload`.
 *
 * @param type - 4-character atom type (Latin-1).
 * @param payload - Atom payload bytes.
 * @returns The encoded box including its 8-byte header.
 */
export const writeBox = (type: string, payload: Uint8Array): Uint8Array => {
  const total = BOX_HEADER_SIZE + payload.length;
  const out = Buffer.alloc(total);
  out.writeUInt32BE(total, 0);
  out.write(type, 4, 4, "latin1");
  Buffer.from(payload).copy(out, 8);
  return new Uint8Array(out);
};
