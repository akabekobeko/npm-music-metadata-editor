import { ID3V2_HEADER_SIZE } from "../constants.js";
import type { Id3v2Frame, Id3v2Tag } from "../types.js";
import { removeUnsynchronization } from "../unsynchronization.js";
import { parseFrame } from "./parseFrame.js";
import { parseHeader } from "./parseHeader.js";

/**
 * Parse an ID3v2 tag at the start of `buffer`.
 *
 * Handles tag-level unsynchronisation, the v2.3+ extended header (skipped),
 * v2.2 frame ID promotion, and the v2.4 footer. Frames are returned in file
 * order; unknown frame IDs are preserved as raw bytes so the writer can
 * round-trip them.
 *
 * @param buffer - Whole-file (or tag-prefix) bytes; the tag starts at offset 0.
 * @returns The parsed tag, or `undefined` when no valid ID3v2 header is present.
 */
export const parseId3v2 = (buffer: Uint8Array): Id3v2Tag | undefined => {
  const header = parseHeader(buffer);
  if (header === undefined) {
    return undefined;
  }

  const tagEnd = ID3V2_HEADER_SIZE + header.bodySize;
  if (tagEnd > buffer.length) {
    return undefined;
  }

  let body = buffer.subarray(ID3V2_HEADER_SIZE, tagEnd);
  if (header.flags.unsynchronization) {
    body = removeUnsynchronization(body);
  }

  // Skip the v2.3+ extended header when present. We do not interpret CRC /
  // restrictions; preserving the rest is enough for round-tripping in Phase 2.
  let cursor = 0;
  if (header.flags.extendedHeader) {
    cursor = skipExtendedHeader(body, header.majorVersion === 4);
    if (cursor === -1) {
      return undefined;
    }
  }

  const frames: Id3v2Frame[] = [];
  while (cursor < body.length) {
    const result = parseFrame({ body, offset: cursor, majorVersion: header.majorVersion });
    if (result.kind === "padding") {
      break;
    }

    if (result.kind === "error") {
      // Skip the rest of the body to avoid infinite loops on corrupt input.
      break;
    }

    frames.push(result.frame);
    cursor += result.consumed;
  }

  const totalSize = ID3V2_HEADER_SIZE + header.bodySize + (header.flags.footer ? 10 : 0);
  return {
    majorVersion: header.majorVersion,
    revision: header.revision,
    flags: header.flags,
    totalSize,
    frames,
  };
};

/**
 * Skip the v2.3 / v2.4 extended header.
 *
 * Returns the offset to start frame parsing from, or `-1` when the extended
 * header is malformed.
 *
 * @param body - Tag body (already de-unsynchronised).
 * @param syncSafe - `true` for ID3v2.4 (extended header size is sync-safe), `false` for ID3v2.3.
 */
const skipExtendedHeader = (body: Uint8Array, syncSafe: boolean): number => {
  if (body.length < 4) {
    return -1;
  }

  const size = syncSafe
    ? ((body[0] as number) << 21) |
      ((body[1] as number) << 14) |
      ((body[2] as number) << 7) |
      (body[3] as number)
    : (body[0] as number) * 0x1000000 +
      ((body[1] as number) << 16) +
      ((body[2] as number) << 8) +
      (body[3] as number);

  // ID3v2.3: `size` excludes the 4-byte size field itself.
  // ID3v2.4: `size` includes the 4-byte size field.
  const consumed = syncSafe ? size : 4 + size;
  if (consumed > body.length) {
    return -1;
  }

  return consumed;
};
