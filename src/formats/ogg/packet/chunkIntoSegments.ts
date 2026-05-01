import { OGG_MAX_SEGMENT_SIZE } from "../constants.js";

/**
 * Split a packet length into the lacing values that encode it.
 *
 * Per RFC 3533 §5, a packet ends as soon as the parser sees a segment with
 * size `< 255`. This function therefore always emits a "terminator" segment
 * whose size is `length % 255` — even when `length` is a multiple of 255 the
 * terminator is `0` so the next packet does not get appended onto this one.
 *
 * @param length - Byte length of the packet to encode.
 * @returns Lacing values (each in `[0, 255]`); their sum equals `length`.
 */
export const chunkIntoSegments = (length: number): readonly number[] => {
  if (length < 0 || !Number.isInteger(length)) {
    throw new RangeError(`chunkIntoSegments: invalid length ${length}`);
  }

  const fullSegments = Math.floor(length / OGG_MAX_SEGMENT_SIZE);
  const remainder = length % OGG_MAX_SEGMENT_SIZE;
  const segments: number[] = new Array(fullSegments).fill(OGG_MAX_SEGMENT_SIZE);
  // Always append the terminator so `length`-multiples-of-255 still mark the
  // packet boundary.
  segments.push(remainder);
  return segments;
};
