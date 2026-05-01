import { ID3V2_HEADER_SIZE } from "../constants.js";
import { removeUnsynchronization } from "../removeUnsynchronization/removeUnsynchronization.js";
import type { Id3v2Frame, Id3v2Tag } from "../types.js";
import { parseFrame } from "./parseFrame/parseFrame.js";
import { parseHeader } from "./parseHeader.js";
import { skipExtendedHeader } from "./skipExtendedHeader.js";

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

  const rawBody = buffer.subarray(ID3V2_HEADER_SIZE, tagEnd);
  const body = header.flags.unsynchronization ? removeUnsynchronization(rawBody) : rawBody;

  // Skip the v2.3+ extended header when present. We do not interpret CRC /
  // restrictions; preserving the rest is enough for round-tripping in Phase 2.
  const startOffset = header.flags.extendedHeader
    ? skipExtendedHeader({ body, syncSafe: header.majorVersion === 4 })
    : 0;
  if (startOffset === -1) {
    return undefined;
  }

  let cursor = startOffset;

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
