import type { TextEncoding } from "../../../../utils/encoding/types.js";
import { stripLeadingTerminator } from "./stripLeadingTerminator.js";

/** A description / text split of a `COMM` or `USLT` body. */
export type SplitParts = { first: Uint8Array; second: Uint8Array };

/**
 * Split the bytes into the description and the text payload at the first
 * encoding-appropriate null terminator.
 *
 * @param bytes - Bytes after the encoding/language prefix.
 * @param encoding - Encoding driving terminator size (1 byte vs 2 bytes for UTF-16).
 * @returns The two halves, or `undefined` when the input is too short to split.
 */
export const splitOnTerminator = (
  bytes: Uint8Array,
  encoding: TextEncoding,
): SplitParts | undefined => {
  if (encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le") {
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
        return {
          first: bytes.subarray(0, i),
          second: stripLeadingTerminator(bytes.subarray(i + 2), true),
        };
      }
    }

    return { first: bytes, second: new Uint8Array() };
  }

  const idx = bytes.indexOf(0x00);
  if (idx === -1) {
    return { first: bytes, second: new Uint8Array() };
  }

  return {
    first: bytes.subarray(0, idx),
    second: stripLeadingTerminator(bytes.subarray(idx + 1), false),
  };
};
