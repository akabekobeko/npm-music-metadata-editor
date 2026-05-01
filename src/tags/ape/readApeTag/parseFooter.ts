import { Buffer } from "node:buffer";
import {
  APE_FOOTER_SIZE,
  APE_MAGIC,
  ApeFlags,
  ApeVersion,
  type ApeVersionValue,
} from "../constants.js";

/**
 * Decoded APE tag footer descriptor.
 *
 * The footer immediately follows the items (or the optional v1 ID3v1 trailer
 * shift, which the caller must subtract before passing bytes in). Its content
 * is identical to the header except the `IsHeader` flag — we only expose the
 * fields the rest of the reader / writer needs.
 */
export type ApeFooter = {
  /** APE version (`1000` or `2000`). */
  version: ApeVersionValue;
  /** Tag size in bytes including the footer; excludes the header for v2. */
  tagSize: number;
  /** Number of items in the tag. */
  itemCount: number;
  /** Raw flags word (used to surface {@link ApeFlags.HasHeader}). */
  flags: number;
  /** `true` when the tag declares a 32-byte header in front of the items. */
  hasHeader: boolean;
};

/**
 * Parse the 32-byte APE tag footer at `offset` of `buffer`.
 *
 * @param buffer - Source bytes (typically the whole file).
 * @param offset - Absolute byte offset where the footer starts.
 * @returns The decoded footer, or `undefined` when the magic does not match
 *   or the version is unknown.
 */
export const parseFooter = (buffer: Uint8Array, offset: number): ApeFooter | undefined => {
  if (offset < 0 || offset + APE_FOOTER_SIZE > buffer.length) {
    return undefined;
  }

  for (let i = 0; i < APE_MAGIC.length; i++) {
    if (buffer[offset + i] !== APE_MAGIC[i]) {
      return undefined;
    }
  }

  const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const version = view.readUInt32LE(offset + 8);
  if (version !== ApeVersion.V1 && version !== ApeVersion.V2) {
    return undefined;
  }

  const tagSize = view.readUInt32LE(offset + 12);
  const itemCount = view.readUInt32LE(offset + 16);
  const flags = view.readUInt32LE(offset + 20);
  // Reserved 8 bytes follow at offset+24..32 — ignored.

  return {
    version: version as ApeVersionValue,
    tagSize,
    itemCount,
    flags,
    hasHeader: (flags & ApeFlags.HasHeader) !== 0,
  };
};
