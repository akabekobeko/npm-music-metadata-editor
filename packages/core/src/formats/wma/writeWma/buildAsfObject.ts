import { Buffer } from "node:buffer";
import { encodeGuid } from "../asf/guid.js";
import { ASF_OBJECT_HEADER_SIZE } from "../constants.js";

/** Arguments for {@link buildAsfObject}. */
type Args = {
  /** Canonical GUID of the object to wrap. */
  guid: string;
  /** Payload bytes that follow the 24-byte object header. */
  payload: Uint8Array;
};

/**
 * Wrap `payload` in a generic 24-byte ASF object header (16-byte GUID +
 * 8-byte little-endian size).
 *
 * @returns The fully formed object: header + payload.
 */
export const buildAsfObject = ({ guid, payload }: Args): Uint8Array => {
  const totalSize = ASF_OBJECT_HEADER_SIZE + payload.length;
  const out = Buffer.alloc(totalSize);
  out.set(encodeGuid(guid), 0);
  out.writeBigUInt64LE(BigInt(totalSize), 16);
  out.set(payload, ASF_OBJECT_HEADER_SIZE);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
