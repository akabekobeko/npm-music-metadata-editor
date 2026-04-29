import type { TextEncoding } from "../../../../utils/encoding/types.js";

/** Map an ID3v2 encoding byte to the encoding name accepted by `decodeText`. */
export const ENCODING_BY_BYTE: Readonly<Record<number, TextEncoding>> = {
  0: "latin1",
  1: "utf16",
  2: "utf16be",
  3: "utf8",
};

/** Detect whether the encoding uses 2-byte code units (UTF-16 family). */
export const isMultiByteEncoding = (encoding: TextEncoding): boolean =>
  encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";
