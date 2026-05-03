import { Buffer } from "node:buffer";
import { encodeSyncSafeInt32 } from "../../../utils/syncSafeInt/encodeSyncSafeInt32.js";
import { ID3V2_FLAG_UNSYNCH, ID3V2_HEADER_SIZE, ID3V2_MAGIC } from "../constants.js";

type Args = {
  /** Major version to emit (`3` or `4`). v2.2 write is unsupported. */
  majorVersion: 3 | 4;
  /** Tag body size in bytes (excluding the 10-byte header). */
  bodySize: number;
  /** Set the unsynchronisation flag bit. */
  unsynchronization?: boolean;
};

/**
 * Build the 10-byte ID3v2 header.
 *
 * The size field uses a syncsafe 32-bit integer regardless of major version
 * (this is true for both v2.3 and v2.4 — only frame sizes differ between them).
 *
 * @returns The 10-byte header ready to prepend to the body.
 */
export const buildHeader = ({ majorVersion, bodySize, unsynchronization }: Args): Uint8Array => {
  const out = Buffer.alloc(ID3V2_HEADER_SIZE);
  out.set(ID3V2_MAGIC, 0);
  out[3] = majorVersion;
  out[4] = 0;
  out[5] = unsynchronization ? ID3V2_FLAG_UNSYNCH : 0;
  out.set(encodeSyncSafeInt32(bodySize), 6);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
