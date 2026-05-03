import { utf16beDecoder, utf16leDecoder } from "./decoders.js";

/**
 * Decode a UTF-16 byte slice that may carry a leading BOM.
 *
 * `0xFFFE` selects little-endian, `0xFEFF` selects big-endian. When no BOM is
 * present the bytes are decoded as little-endian, which matches the de facto
 * convention used by most ID3v2.3 writers.
 *
 * @param bytes - UTF-16 bytes, optionally prefixed with a BOM.
 * @returns The decoded string.
 */
export const decodeUtf16WithBom = (bytes: Uint8Array): string => {
  if (bytes.length >= 2) {
    const lo = bytes[0] as number;
    const hi = bytes[1] as number;
    if (lo === 0xff && hi === 0xfe) {
      return utf16leDecoder.decode(bytes.subarray(2));
    }

    if (lo === 0xfe && hi === 0xff) {
      return utf16beDecoder.decode(bytes.subarray(2));
    }
  }

  // No BOM: assume little-endian (matches what ID3v2 writers tend to produce).
  return utf16leDecoder.decode(bytes);
};
