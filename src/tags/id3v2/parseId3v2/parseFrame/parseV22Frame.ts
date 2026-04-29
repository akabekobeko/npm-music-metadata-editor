import { Buffer } from "node:buffer";
import { ID3V2_2_TO_2_3_FRAME_ID } from "../../constants.js";
import { NO_FLAGS, type ParseFrameResult } from "./types.js";

/**
 * ID3v2.2 frame layout: 3-byte ID + 3-byte size + body (no flags, no unsync flag).
 *
 * @param body - Tag-body bytes (already de-unsynchronised).
 * @param offset - Offset within `body` where the frame header begins.
 * @returns A {@link ParseFrameResult} describing the parsed frame, error, or padding.
 */
export const parseV22Frame = (body: Uint8Array, offset: number): ParseFrameResult => {
  if (offset + 6 > body.length) {
    return { kind: "error", consumed: body.length - offset, reason: "truncated v2.2 frame" };
  }

  const idBytes = body.subarray(offset, offset + 3);
  const id22 = Buffer.from(idBytes).toString("latin1");
  const size =
    (body[offset + 3] as number) * 0x10000 +
    (body[offset + 4] as number) * 0x100 +
    (body[offset + 5] as number);
  const dataStart = offset + 6;
  if (dataStart + size > body.length) {
    return {
      kind: "error",
      consumed: body.length - offset,
      reason: `v2.2 frame "${id22}" overflows tag body`,
    };
  }

  const data = body.subarray(dataStart, dataStart + size);
  // Promote to v2.3/2.4 ID so downstream parsers share one path.
  const id = ID3V2_2_TO_2_3_FRAME_ID[id22] ?? id22;
  return {
    kind: "frame",
    frame: { id, flags: NO_FLAGS, data },
    consumed: 6 + size,
  };
};
