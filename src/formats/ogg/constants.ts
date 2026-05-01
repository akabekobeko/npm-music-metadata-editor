/** Capture pattern that opens every Ogg page (`"OggS"`). */
export const OGG_CAPTURE_PATTERN = new Uint8Array([0x4f, 0x67, 0x67, 0x53]);

/** Length of the capture pattern. */
export const OGG_CAPTURE_PATTERN_SIZE = OGG_CAPTURE_PATTERN.length;

/**
 * Length of the fixed portion of an Ogg page header (everything before the
 * variable-length segment table).
 */
export const OGG_PAGE_HEADER_FIXED_SIZE = 27;

/** Maximum number of lacing segments per page. */
export const OGG_MAX_SEGMENTS_PER_PAGE = 255;

/** Maximum size of a single lacing segment (the "255 byte" lacing rule). */
export const OGG_MAX_SEGMENT_SIZE = 255;

/** Byte offset of the 32-bit CRC field within the fixed page header. */
export const OGG_CRC_OFFSET = 22;

/**
 * Bit flags carried by the 8-bit `header_type` field of every Ogg page.
 *
 * Source: RFC 3533 §6.
 */
export const OggHeaderType = {
  /** Page is a continuation of a packet started on a previous page. */
  Continuation: 0x01,
  /** First page of a logical bitstream (BOS). */
  BeginningOfStream: 0x02,
  /** Last page of a logical bitstream (EOS). */
  EndOfStream: 0x04,
} as const;

/** Numeric value drawn from {@link OggHeaderType}. */
export type OggHeaderTypeValue = (typeof OggHeaderType)[keyof typeof OggHeaderType];
