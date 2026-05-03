import { BOX_HEADER_SIZE, META_VERSION_FLAGS_SIZE } from "../../constants.js";
import { readUInt32 } from "./readUInt32.js";

/** Arguments for {@link detectMetaChildStart}. */
type Args = {
  /** Source buffer. */
  source: Uint8Array;
  /** Absolute offset where the `meta` payload starts. */
  payloadOffset: number;
  /** Length of the `meta` payload. */
  payloadSize: number;
};

/**
 * Probe a `meta` atom's payload to figure out where its children begin.
 *
 * If the first 4 bytes are a plausible atom size (8 ≤ size ≤ remaining), we
 * assume the box is the QuickTime variant *without* a version/flags prefix.
 * Otherwise the box is treated as a FullBox and the prefix is skipped.
 *
 * @returns The absolute offset where parsing of children should begin.
 */
export const detectMetaChildStart = ({ source, payloadOffset, payloadSize }: Args): number => {
  if (payloadSize < BOX_HEADER_SIZE) {
    return payloadOffset;
  }

  const firstSize = readUInt32(source, payloadOffset);
  const looksLikeChildHeader = firstSize >= BOX_HEADER_SIZE && firstSize <= payloadSize;
  if (looksLikeChildHeader) {
    return payloadOffset;
  }

  return payloadOffset + META_VERSION_FLAGS_SIZE;
};
