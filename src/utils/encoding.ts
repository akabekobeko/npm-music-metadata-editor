import { Buffer } from "node:buffer";

/**
 * Text encodings recognised by the binary I/O helpers.
 *
 * - `"latin1"` — ISO-8859-1 single-byte encoding (ID3v2.3 default).
 * - `"utf8"` — UTF-8 (ID3v2.4, FLAC Vorbis Comment, MP4 atoms).
 * - `"utf16le"` — UTF-16 little-endian without BOM.
 * - `"utf16be"` — UTF-16 big-endian without BOM (handled via `TextDecoder`).
 * - `"utf16"` — UTF-16 with a leading BOM (ID3v2.3 text encoding `0x01`).
 * - `"ascii"` — 7-bit ASCII; bytes >= 0x80 are masked to 0.
 */
export type TextEncoding = "latin1" | "utf8" | "utf16le" | "utf16be" | "utf16" | "ascii";

/** Shared `TextDecoder` for UTF-16BE bytes (the WHATWG label `Buffer` does not accept). */
const utf16beDecoder = new TextDecoder("utf-16be");
/** Shared `TextDecoder` for UTF-16LE bytes; reused for BOM-less decoding. */
const utf16leDecoder = new TextDecoder("utf-16le");

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
const decodeUtf16WithBom = (bytes: Uint8Array): string => {
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

/**
 * Encode a string as UTF-16BE bytes (no BOM).
 *
 * Implemented manually because Node.js `Buffer` only knows UTF-16LE; for the
 * BE case we emit the high byte first, low byte second, per code unit.
 *
 * @param value - String to encode.
 * @returns UTF-16BE bytes (`value.length * 2` bytes).
 */
const encodeUtf16Be = (value: string): Uint8Array => {
  const out = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i);
    out[i * 2] = (code >>> 8) & 0xff;
    out[i * 2 + 1] = code & 0xff;
  }

  return out;
};
