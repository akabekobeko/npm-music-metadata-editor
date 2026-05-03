import type { TextEncoding } from "../../../../utils/encoding/types.js";
import { isMultiByteEncoding } from "./encodingByteMap.js";
import { trimTrailingUtf16Terminators } from "./trimTrailingUtf16Terminators.js";
import { trimTrailingZeroBytes } from "./trimTrailingZeroBytes.js";

/**
 * Slice off any trailing null terminator(s) from a text-frame payload.
 *
 * @param bytes - Bytes that may end with one or more terminator bytes.
 * @param encoding - Encoding driving terminator size (1 byte vs 2 bytes for UTF-16).
 * @returns A view sharing memory with `bytes`, ending before the terminator(s).
 */
export const stripTerminator = (bytes: Uint8Array, encoding: TextEncoding): Uint8Array => {
  const end = isMultiByteEncoding(encoding)
    ? trimTrailingUtf16Terminators(bytes)
    : trimTrailingZeroBytes(bytes);
  return bytes.subarray(0, end);
};
