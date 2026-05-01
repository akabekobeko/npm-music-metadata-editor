import { Buffer } from "node:buffer";
import { decodeText } from "../../../utils/encoding/decodeText.js";
import {
  APE_ITEM_HEADER_FIXED_SIZE,
  ApeFlags,
  ApeItemKind,
  type ApeItemKindValue,
} from "../constants.js";
import type { ApeItem } from "../types.js";

/**
 * Result of {@link parseItem}.
 *
 * `consumed` is the byte distance from the item start to the next item — i.e.
 * `header bytes + key bytes + 1 (NUL) + value bytes`. The caller advances its
 * cursor by this amount.
 */
export type ParsedApeItem = {
  /** Decoded item. */
  item: ApeItem;
  /** Number of bytes the item occupied. */
  consumed: number;
};

/**
 * Parse a single APE item starting at `offset` of `body`.
 *
 * Layout: `valueSize:u32le + flags:u32le + key:asciiz + value:bytes`. The
 * `valueSize` only covers the value payload; the key is a NUL-terminated
 * ASCII string immediately preceding it.
 *
 * @param body - Tag body bytes (items only — without header / footer).
 * @param offset - Offset within `body` where the item begins.
 * @returns The parsed item plus the number of bytes consumed, or `undefined`
 *   when the item is malformed (truncated, missing key terminator, …).
 */
export const parseItem = (body: Uint8Array, offset: number): ParsedApeItem | undefined => {
  if (offset + APE_ITEM_HEADER_FIXED_SIZE > body.length) {
    return undefined;
  }

  const view = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const valueSize = view.readUInt32LE(offset);
  const flags = view.readUInt32LE(offset + 4);
  const keyStart = offset + APE_ITEM_HEADER_FIXED_SIZE;

  // The key is ASCII and NUL-terminated. Locate the terminator inside what
  // remains of the body.
  let keyEnd = keyStart;
  while (keyEnd < body.length && body[keyEnd] !== 0x00) {
    keyEnd++;
  }
  if (keyEnd >= body.length) {
    return undefined;
  }

  const valueStart = keyEnd + 1;
  if (valueStart + valueSize > body.length) {
    return undefined;
  }

  const key = decodeText(body.subarray(keyStart, keyEnd), "ascii");
  const kind = decodeKind(flags);
  const valueBytes = body.subarray(valueStart, valueStart + valueSize);
  const value = kind === ApeItemKind.Text ? decodeText(valueBytes, "utf8") : valueBytes;

  return {
    item: {
      key,
      value,
      kind,
      readOnly: (flags & ApeFlags.ReadOnly) !== 0,
    },
    consumed: APE_ITEM_HEADER_FIXED_SIZE + (keyEnd - keyStart) + 1 + valueSize,
  };
};

/**
 * Map the 32-bit item flags word onto {@link ApeItemKind}.
 *
 * Reserved kind `3` is folded into {@link ApeItemKind.Binary} so the bytes
 * still round-trip even when the file uses a non-standard kind code.
 *
 * @param flags - Raw 32-bit flags word.
 * @returns The decoded item kind.
 */
const decodeKind = (flags: number): ApeItemKindValue => {
  const kind = (flags & ApeFlags.ItemKindMask) >>> 1;
  if (kind === ApeItemKind.Text || kind === ApeItemKind.External) {
    return kind;
  }

  return ApeItemKind.Binary;
};
