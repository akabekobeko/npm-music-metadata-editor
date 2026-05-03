import { Buffer } from "node:buffer";
import type { ItunesDataValue } from "../../types.js";

/**
 * Decode a 1/2/3/4-byte big-endian *signed* integer (iTunes type indicator
 * 21). The sibling type 22 (unsigned) is not currently consumed by any
 * field this module handles, so only the signed path is implemented.
 *
 * @param value - The value whose `data` bytes hold the integer.
 * @returns The decoded number, or `undefined` when the byte length is invalid.
 */
export const readBeSignedInt = (value: ItunesDataValue): number | undefined => {
  const bytes = value.data;
  if (bytes.length === 0 || bytes.length > 4) {
    return undefined;
  }

  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length === 1) {
    return view.readInt8(0);
  }

  if (bytes.length === 2) {
    return view.readInt16BE(0);
  }

  if (bytes.length === 3) {
    return view.readIntBE(0, 3);
  }

  return view.readInt32BE(0);
};
