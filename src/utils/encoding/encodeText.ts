import { Buffer } from "node:buffer";
import { encodeUtf16Be } from "./encodeUtf16Be.js";
import type { TextEncoding } from "./types.js";

/**
 * Encode a string to bytes using the given encoding.
 *
 * `"utf16"` emits a `0xFFFE` little-endian BOM followed by the UTF-16LE payload.
 * `"utf16be"` emits raw UTF-16BE bytes with no BOM.
 *
 * @param value - String to encode.
 * @param encoding - Target text encoding.
 * @returns Encoded bytes (no length prefix, no terminator).
 */
export const encodeText = (value: string, encoding: TextEncoding): Uint8Array => {
  if (encoding === "utf16be") {
    return encodeUtf16Be(value);
  }

  if (encoding === "utf16") {
    const payload = Buffer.from(value, "utf16le");
    const out = Buffer.alloc(payload.length + 2);
    out[0] = 0xff;
    out[1] = 0xfe;
    payload.copy(out, 2);
    return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
  }

  const buf = Buffer.from(value, encoding);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
};
