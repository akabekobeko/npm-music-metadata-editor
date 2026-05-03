import { ID3V1_MAGIC, ID3V1_TAG_SIZE } from "../../id3v1/constants.js";
import { APE_FOOTER_SIZE } from "../constants.js";
import { parseFooter } from "./parseFooter.js";

/**
 * Result of locating an APE tag inside a buffer.
 *
 * `tagStart` points to the first byte of the tag (header for v2, items for
 * v1). `tagEnd` is one past the last byte of the footer, so callers can take
 * `buffer.subarray(tagStart, tagEnd)` to materialise the tag.
 */
export type ApeTagLocation = {
  /** Absolute offset of the first tag byte (header for v2, first item for v1). */
  tagStart: number;
  /** Absolute offset of the byte just past the footer. */
  tagEnd: number;
  /** `true` when an ID3v1 trailer follows the APE footer. */
  id3v1Present: boolean;
};

/**
 * Find an APE tag at the tail of `buffer`, accounting for an optional ID3v1 trailer.
 *
 * Layout candidates inspected:
 * - `... + APE footer + ID3v1` (most common when MP3 carries both)
 * - `... + APE footer` (clean tail)
 *
 * @param buffer - Whole-file bytes.
 * @returns The tag location, or `undefined` when no APE tag is present.
 */
export const findApeTagOffset = (buffer: Uint8Array): ApeTagLocation | undefined => {
  if (buffer.length < APE_FOOTER_SIZE) {
    return undefined;
  }

  const id3v1Present = hasTrailingId3v1(buffer);
  const dataShift = id3v1Present ? ID3V1_TAG_SIZE : 0;
  const footerOffset = buffer.length - dataShift - APE_FOOTER_SIZE;
  if (footerOffset < 0) {
    return undefined;
  }

  const footer = parseFooter(buffer, footerOffset);
  if (footer === undefined) {
    return undefined;
  }

  const tagEnd = footerOffset + APE_FOOTER_SIZE;
  // `tagSize` excludes the optional v2 header — derive the start by walking
  // back from the footer end.
  const itemsAndFooterSize = footer.tagSize;
  const headerSize = footer.hasHeader ? APE_FOOTER_SIZE : 0;
  const tagStart = tagEnd - itemsAndFooterSize - headerSize;
  if (tagStart < 0) {
    return undefined;
  }

  return { tagStart, tagEnd, id3v1Present };
};

/**
 * Return `true` when `buffer` ends with an ID3v1 trailer (`"TAG"` magic at the
 * 128-byte tail).
 *
 * @param buffer - Whole-file bytes.
 * @returns `true` when an ID3v1 trailer is present.
 */
const hasTrailingId3v1 = (buffer: Uint8Array): boolean => {
  if (buffer.length < ID3V1_TAG_SIZE) {
    return false;
  }

  const offset = buffer.length - ID3V1_TAG_SIZE;
  return (
    buffer[offset] === ID3V1_MAGIC[0] &&
    buffer[offset + 1] === ID3V1_MAGIC[1] &&
    buffer[offset + 2] === ID3V1_MAGIC[2]
  );
};
