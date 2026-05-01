import { Buffer } from "node:buffer";
import { APE_FOOTER_SIZE, APE_MAGIC, ApeFlags, type ApeVersionValue } from "../constants.js";

/** Arguments for {@link writeDescriptor}. */
type Args = {
  /** Tag version to embed (`1000` or `2000`). */
  version: ApeVersionValue;
  /** Tag size value to write (footer + items, excluding the optional header). */
  tagSize: number;
  /** Number of items in the tag. */
  itemCount: number;
  /** Tag-level flags (without the {@link ApeFlags.IsHeader} bit). */
  baseFlags: number;
  /** `true` when this descriptor is the front-of-tag header rather than the footer. */
  isHeader: boolean;
};

/**
 * Encode a single 32-byte APE header / footer descriptor.
 *
 * The header and footer share the same 32-byte layout — the only difference
 * is the {@link ApeFlags.IsHeader} bit. Reserved bytes are zero-filled.
 *
 * @returns The encoded 32 bytes.
 */
export const writeDescriptor = ({
  version,
  tagSize,
  itemCount,
  baseFlags,
  isHeader,
}: Args): Uint8Array => {
  const out = Buffer.alloc(APE_FOOTER_SIZE);
  out.set(APE_MAGIC, 0);
  out.writeUInt32LE(version, 8);
  out.writeUInt32LE(tagSize, 12);
  out.writeUInt32LE(itemCount, 16);
  const flags = (baseFlags | (isHeader ? ApeFlags.IsHeader : 0)) >>> 0;
  out.writeUInt32LE(flags, 20);
  // Reserved 8 bytes at offset 24..32 stay zero-filled.
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
