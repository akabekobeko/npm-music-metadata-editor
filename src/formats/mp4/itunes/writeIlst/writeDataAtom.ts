import { Buffer } from "node:buffer";
import type { ItunesDataValue } from "../../types.js";
import { writeBox } from "./writeBox.js";

/** Bytes consumed by `data` atom's `(typeIndicator, locale)` prefix. */
const DATA_PREFIX_SIZE = 8;

/**
 * Serialize one `data` value into a complete `data` atom.
 *
 * @param value - The value to encode.
 * @returns The encoded box bytes.
 */
export const writeDataAtom = (value: ItunesDataValue): Uint8Array => {
  const payload = Buffer.alloc(DATA_PREFIX_SIZE + value.data.length);
  payload.writeUInt32BE(value.typeIndicator & 0x00ffffff, 0);
  payload.writeUInt32BE(value.locale, 4);
  Buffer.from(value.data).copy(payload, DATA_PREFIX_SIZE);
  return writeBox("data", new Uint8Array(payload));
};
