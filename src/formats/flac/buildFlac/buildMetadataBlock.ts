import { Buffer } from "node:buffer";
import {
  FLAC_BLOCK_TYPE_MASK,
  FLAC_LAST_BLOCK_FLAG,
  FLAC_METADATA_BLOCK_HEADER_SIZE,
} from "../constants.js";

/** Arguments for {@link buildMetadataBlock}. */
type Args = {
  /** Block type (`0..127`). The high bit is reserved for the `isLast` flag. */
  type: number;
  /** Block body bytes (not including the 4-byte header). */
  data: Uint8Array;
  /** When `true`, set the `is_last` flag in the block header. */
  isLast: boolean;
};

/**
 * Concatenate a 4-byte FLAC metadata block header with the given body.
 *
 * Header layout: `is_last:1 + type:7 + length:24 (big endian)`.
 *
 * @returns A new buffer containing the header + body.
 * @throws RangeError when `data.length` exceeds the 24-bit length field.
 */
export const buildMetadataBlock = (args: Args): Uint8Array => {
  if (args.data.length > 0xffffff) {
    throw new RangeError(`buildMetadataBlock: body length ${args.data.length} exceeds 24-bit max`);
  }

  const out = Buffer.alloc(FLAC_METADATA_BLOCK_HEADER_SIZE + args.data.length);
  const typeByte = (args.type & FLAC_BLOCK_TYPE_MASK) | (args.isLast ? FLAC_LAST_BLOCK_FLAG : 0);
  out.writeUInt8(typeByte, 0);
  out.writeUIntBE(args.data.length, 1, 3);
  out.set(args.data, FLAC_METADATA_BLOCK_HEADER_SIZE);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
