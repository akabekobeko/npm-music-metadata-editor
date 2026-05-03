import { Buffer } from "node:buffer";
import type { ItunesDataValue } from "../../types.js";

/**
 * Parse a `trkn` / `disk` payload into `(number, total)` pair. Both atoms
 * use a 4-byte reserved prefix + 2-byte index + 2-byte total layout (and
 * `trkn` carries 2 extra bytes beyond that, which we ignore).
 *
 * @param value - The value whose `data` bytes hold the pair.
 * @returns The decoded pair, or `undefined` when the data is too short.
 */
export const readNumberAndTotal = (
  value: ItunesDataValue,
): { number?: number; total?: number } | undefined => {
  const bytes = value.data;
  if (bytes.length < 6) {
    return undefined;
  }

  const view = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const number = view.readUInt16BE(2);
  const total = view.readUInt16BE(4);
  return {
    ...(number > 0 ? { number } : {}),
    ...(total > 0 ? { total } : {}),
  };
};
