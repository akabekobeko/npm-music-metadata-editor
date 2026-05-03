import { Buffer } from "node:buffer";
import { encodeGuid } from "../asf/guid.js";
import { ASF_GUID, ASF_HEADER_OBJECT_PREAMBLE_SIZE, ASF_OBJECT_HEADER_SIZE } from "../constants.js";

/** Arguments for {@link buildHeaderObject}. */
type Args = {
  /** Concatenated child object bytes (their own headers included). */
  children: Uint8Array;
  /** Number of top-level children encoded inside `children`. */
  childCount: number;
};

/**
 * Wrap a sequence of pre-built child objects in the Header Object envelope.
 *
 * The envelope is 30 bytes long: 16-byte GUID, 8-byte total size,
 * 4-byte child count, 2 reserved bytes (`0x01`, `0x02` per the ASF spec).
 *
 * @returns The full Header Object bytes.
 */
export const buildHeaderObject = ({ children, childCount }: Args): Uint8Array => {
  const totalSize = ASF_HEADER_OBJECT_PREAMBLE_SIZE + children.length;
  const out = Buffer.alloc(totalSize);
  out.set(encodeGuid(ASF_GUID.HeaderObject), 0);
  out.writeBigUInt64LE(BigInt(totalSize), 16);
  out.writeUInt32LE(childCount, ASF_OBJECT_HEADER_SIZE);
  // The two reserved bytes are mandated as 0x01 / 0x02 by the spec; ASF
  // demuxers refuse to parse files with any other value here.
  out.writeUInt8(0x01, ASF_OBJECT_HEADER_SIZE + 4);
  out.writeUInt8(0x02, ASF_OBJECT_HEADER_SIZE + 5);
  out.set(children, ASF_HEADER_OBJECT_PREAMBLE_SIZE);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
