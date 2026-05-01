import { Buffer } from "node:buffer";
import type { ItunesDataValue } from "../../types.js";

/**
 * Decode a UTF-8 string carried by a single `data` value.
 *
 * @param value - The value to decode.
 * @returns The decoded string.
 */
export const readUtf8 = (value: ItunesDataValue): string =>
  Buffer.from(value.data.buffer, value.data.byteOffset, value.data.byteLength).toString("utf8");
