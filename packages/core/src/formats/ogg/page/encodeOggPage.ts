import { Buffer } from "node:buffer";
import {
  OGG_CAPTURE_PATTERN,
  OGG_CRC_OFFSET,
  OGG_MAX_SEGMENT_SIZE,
  OGG_MAX_SEGMENTS_PER_PAGE,
  OGG_PAGE_HEADER_FIXED_SIZE,
} from "../constants.js";
import { crc32Ogg } from "./crc32.js";

/** Arguments for {@link encodeOggPage}. */
type Args = {
  /** Bit flags drawn from `OggHeaderType`. */
  headerType: number;
  /** Codec-defined granule position for this page. */
  granulePosition: bigint;
  /** Logical bitstream serial number. */
  serialNumber: number;
  /** Page sequence number within the bitstream. */
  pageSequence: number;
  /** Lacing values; each element must be in `[0, 255]` and the array length `<= 255`. */
  segmentSizes: readonly number[];
  /** Payload bytes whose total length equals the sum of `segmentSizes`. */
  payload: Uint8Array;
};

/**
 * Encode a single Ogg page (header + segment table + payload + CRC).
 *
 * Computes the CRC32 in place per RFC 3533 §6 — the checksum bytes are first
 * written as `0`, then the page is hashed and the field is patched with the
 * resulting value.
 *
 * @returns A freshly-allocated buffer holding the complete page bytes.
 * @throws RangeError when `segmentSizes` violates the lacing constraints or
 *   when `payload` size disagrees with `segmentSizes`.
 */
export const encodeOggPage = ({
  headerType,
  granulePosition,
  serialNumber,
  pageSequence,
  segmentSizes,
  payload,
}: Args): Uint8Array => {
  if (segmentSizes.length > OGG_MAX_SEGMENTS_PER_PAGE) {
    throw new RangeError(
      `encodeOggPage: ${segmentSizes.length} segments exceeds the per-page limit (${OGG_MAX_SEGMENTS_PER_PAGE})`,
    );
  }

  const expectedPayloadSize = segmentSizes.reduce((sum, size) => {
    if (size < 0 || size > OGG_MAX_SEGMENT_SIZE) {
      throw new RangeError(`encodeOggPage: invalid lacing value ${size}`);
    }

    return sum + size;
  }, 0);
  if (expectedPayloadSize !== payload.length) {
    throw new RangeError(
      `encodeOggPage: payload size (${payload.length}) does not match segment total (${expectedPayloadSize})`,
    );
  }

  const headerSize = OGG_PAGE_HEADER_FIXED_SIZE + segmentSizes.length;
  const out = Buffer.alloc(headerSize + payload.length);

  out.set(OGG_CAPTURE_PATTERN, 0);
  // version is always 0 per RFC 3533 §6.
  out.writeUInt8(0, 4);
  out.writeUInt8(headerType, 5);
  out.writeBigUInt64LE(granulePosition, 6);
  out.writeUInt32LE(serialNumber, 14);
  out.writeUInt32LE(pageSequence, 18);
  // CRC field is left zero until the entire page is built.
  out.writeUInt32LE(0, OGG_CRC_OFFSET);
  out.writeUInt8(segmentSizes.length, 26);
  for (let i = 0; i < segmentSizes.length; i++) {
    out.writeUInt8(segmentSizes[i] ?? 0, OGG_PAGE_HEADER_FIXED_SIZE + i);
  }

  out.set(payload, headerSize);

  const crc = crc32Ogg(out);
  out.writeUInt32LE(crc, OGG_CRC_OFFSET);

  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
