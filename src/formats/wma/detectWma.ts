import { encodeGuid } from "./asf/guid.js";
import { ASF_GUID, ASF_GUID_SIZE } from "./constants.js";

/** On-disk Header Object GUID bytes; computed once and reused on every probe. */
const HEADER_OBJECT_BYTES = encodeGuid(ASF_GUID.HeaderObject);

/**
 * Return `true` when `header` starts with the ASF Header Object GUID.
 *
 * This matches every ASF-derived format Microsoft ever shipped (`.wma`,
 * `.wmv`, `.asf`); telling them apart is the job of stream-level inspection
 * which this Phase 8 implementation deliberately leaves out of scope.
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 * @returns `true` when the leading 16 bytes spell the Header Object GUID.
 */
export const detectWmaSignature = (header: Uint8Array): boolean => {
  if (header.length < ASF_GUID_SIZE) {
    return false;
  }

  for (let i = 0; i < ASF_GUID_SIZE; i++) {
    if (header[i] !== HEADER_OBJECT_BYTES[i]) {
      return false;
    }
  }

  return true;
};
