import { Buffer } from "node:buffer";
import { utf16beDecoder } from "./decoders.js";
import { decodeUtf16WithBom } from "./decodeUtf16WithBom.js";
import type { TextEncoding } from "./types.js";

/**
 * Decode a byte slice to a string using the given encoding.
 *
 * For `"utf16"`, a leading BOM (`0xFFFE` or `0xFEFF`) selects endianness; if no BOM
 * is present the input is treated as little-endian (matching the ID3v2 default).
 *
 * @param bytes - Source bytes to decode.
 * @param encoding - Text encoding to interpret `bytes` with.
 * @returns The decoded string.
 */
export const decodeText = (bytes: Uint8Array, encoding: TextEncoding): string => {
  if (encoding === "utf16be") {
    return utf16beDecoder.decode(bytes);
  }

  if (encoding === "utf16") {
    return decodeUtf16WithBom(bytes);
  }

  // Buffer.from on a Uint8Array shares memory; .toString does the decoding.
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString(encoding);
};
