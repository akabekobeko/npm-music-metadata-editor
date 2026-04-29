import type { TextEncoding } from "../../../../utils/encoding/types.js";
import { isMultiByteEncoding } from "./encodingByteMap.js";

/** Slice off any trailing null terminator(s) from a text-frame payload. */
export const stripTerminator = (bytes: Uint8Array, encoding: TextEncoding): Uint8Array => {
  if (isMultiByteEncoding(encoding)) {
    let end = bytes.length;
    while (end >= 2 && bytes[end - 1] === 0x00 && bytes[end - 2] === 0x00) {
      end -= 2;
    }

    return bytes.subarray(0, end);
  }

  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0x00) {
    end -= 1;
  }

  return bytes.subarray(0, end);
};
