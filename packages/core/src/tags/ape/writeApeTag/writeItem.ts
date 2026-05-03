import { Buffer } from "node:buffer";
import { encodeText } from "../../../utils/encoding/encodeText.js";
import { ApeFlags, ApeItemKind } from "../constants.js";
import type { ApeItem } from "../types.js";

/**
 * Encode a single APE item.
 *
 * Layout: `valueSize:u32le + flags:u32le + key:asciiz + value:bytes`. The
 * key encoding is ASCII per the APE specification — non-ASCII bytes are
 * rejected to avoid producing tags that would round-trip differently.
 *
 * @param item - Item to encode.
 * @returns The encoded bytes.
 * @throws RangeError when the key is empty, contains an illegal byte, or the
 *   item kind / value pair is inconsistent (text item with binary bytes,
 *   binary item with a string).
 */
export const writeItem = (item: ApeItem): Uint8Array => {
  checkKey(item.key);

  const valueBytes = encodeValue(item);
  const keyBytes = encodeText(item.key, "ascii");
  const flags = encodeFlags(item);

  const out = Buffer.alloc(8 + keyBytes.length + 1 + valueBytes.length);
  out.writeUInt32LE(valueBytes.length, 0);
  out.writeUInt32LE(flags, 4);
  out.set(keyBytes, 8);
  out[8 + keyBytes.length] = 0x00;
  out.set(valueBytes, 8 + keyBytes.length + 1);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/**
 * Encode the value side of an item.
 *
 * Text items are encoded as UTF-8 strings; binary / external items keep their
 * raw bytes. A string supplied for a binary item is treated as ASCII text
 * (locator / URL strings come through as `string` even when `kind` is
 * `External`).
 *
 * @param item - Item whose value is being serialised.
 * @returns Raw value bytes.
 */
const encodeValue = (item: ApeItem): Uint8Array => {
  if (item.kind === ApeItemKind.Text) {
    if (typeof item.value !== "string") {
      throw new RangeError(`writeItem: text item "${item.key}" must hold a string value`);
    }

    return encodeText(item.value, "utf8");
  }

  if (typeof item.value === "string") {
    return encodeText(item.value, "utf8");
  }

  return item.value;
};

/**
 * Build the 32-bit flags word for an item.
 *
 * @param item - Source item.
 * @returns Flags word ready to write LE.
 */
const encodeFlags = (item: ApeItem): number => {
  let flags = (item.kind << 1) & ApeFlags.ItemKindMask;
  if (item.readOnly) {
    flags |= ApeFlags.ReadOnly;
  }

  return flags >>> 0;
};

/**
 * Reject keys that the APE specification forbids.
 *
 * Per the spec the key must be ASCII printable (`[0x20, 0x7E]`) and 2..255
 * characters long. We additionally exclude `=` and NUL because those would
 * collide with the binary framing.
 *
 * @param key - Key to validate.
 * @throws RangeError when the key is empty / too long / contains illegal bytes.
 */
const checkKey = (key: string): void => {
  if (key.length < 2 || key.length > 255) {
    throw new RangeError(`writeItem: key "${key}" must be 2..255 characters long`);
  }

  for (let i = 0; i < key.length; i++) {
    const code = key.charCodeAt(i);
    if (code < 0x20 || code > 0x7e || code === 0x3d) {
      throw new RangeError(`writeItem: key "${key}" contains an illegal byte at position ${i}`);
    }
  }
};
