import { Buffer } from "node:buffer";
import { encodeSyncSafeInt32 } from "../../../utils/syncSafeInt/encodeSyncSafeInt32.js";
import type { Id3v2Frame } from "../types.js";

type BuildFrameArgs = {
  /** Frame to encode. */
  frame: Id3v2Frame;
  /** Major version (`3` or `4`) — controls how the size field is encoded. */
  majorVersion: 3 | 4;
};

/**
 * Build the bytes for one ID3v2.3 / ID3v2.4 frame (10-byte header + body).
 *
 * Frame body bytes are emitted as-is — callers are responsible for handling
 * encoding bytes, terminators, and unsync. Status / format flag bytes are zero
 * because Phase 2's writer never sets per-frame flags.
 *
 * @returns The complete frame bytes (header + body).
 */
export const buildFrame = (args: BuildFrameArgs): Uint8Array => {
  const { frame, majorVersion } = args;
  if (frame.id.length !== 4) {
    throw new Error(`buildFrame: frame ID must be 4 chars (got "${frame.id}")`);
  }

  const header = Buffer.alloc(10);
  header.write(frame.id, 0, 4, "latin1");
  if (majorVersion === 4) {
    header.set(encodeSyncSafeInt32(frame.data.length), 4);
  } else {
    header.writeUInt32BE(frame.data.length >>> 0, 4);
  }

  // Status flag byte (0x08): leave at 0 — no preservation / read-only flags.
  // Format flag byte (0x09): leave at 0 — no compression / encryption / unsync.
  const out = new Uint8Array(10 + frame.data.length);
  out.set(header, 0);
  out.set(frame.data, 10);
  return out;
};
