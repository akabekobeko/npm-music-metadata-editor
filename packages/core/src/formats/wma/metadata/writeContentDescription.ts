import { Buffer } from "node:buffer";
import { encodeText } from "../../../utils/encoding/encodeText.js";
import type { ContentDescription } from "./types.js";

/** Bytes consumed by the five 16-bit length fields at the start of the payload. */
const LENGTH_TABLE_SIZE = 10;

/**
 * Build a Content Description Object payload from its five fixed fields.
 *
 * Each non-empty field is emitted as a null-terminated UTF-16LE string; the
 * length stored in the header is in bytes (string length in characters * 2,
 * plus 2 bytes for the terminator). Empty fields are stored with `length = 0`
 * and contribute no bytes.
 *
 * @param description - The five fields to serialise.
 * @returns Bytes of the Content Description Object payload (the bytes that
 *   sit *after* the 24-byte ASF object header).
 */
export const writeContentDescription = (description: ContentDescription): Uint8Array => {
  const fields = [
    description.title,
    description.author,
    description.copyright,
    description.description,
    description.rating,
  ];

  const encoded = fields.map((field) =>
    field === "" ? new Uint8Array() : encodeFieldWithTerminator(field),
  );
  const total = encoded.reduce((sum, bytes) => sum + bytes.length, LENGTH_TABLE_SIZE);
  const out = Buffer.alloc(total);
  for (let i = 0; i < encoded.length; i++) {
    out.writeUInt16LE(encoded[i]?.length ?? 0, i * 2);
  }

  let cursor = LENGTH_TABLE_SIZE;
  for (const bytes of encoded) {
    out.set(bytes, cursor);
    cursor += bytes.length;
  }

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Encode `value` as UTF-16LE and append the 2-byte null terminator.
 *
 * Inlined here (rather than relying on `encodeText("utf16")`) because the
 * Content Description format mandates UTF-16LE without a BOM, while
 * `encodeText("utf16")` prepends a BOM to make ID3v2 happy.
 *
 * @param value - String to encode.
 * @returns The UTF-16LE bytes followed by the 2-byte null terminator.
 */
const encodeFieldWithTerminator = (value: string): Uint8Array => {
  const payload = encodeText(value, "utf16le");
  const out = Buffer.alloc(payload.length + 2);
  out.set(payload, 0);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
