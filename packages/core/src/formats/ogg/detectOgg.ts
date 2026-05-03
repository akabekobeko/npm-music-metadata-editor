import { OGG_CAPTURE_PATTERN, OGG_PAGE_HEADER_FIXED_SIZE } from "./constants.js";
import { OPUS_HEAD_MAGIC } from "./streams/constants.js";
import { startsWith } from "./streams/startsWith.js";
import { isVorbisIdPacket } from "./streams/vorbis.js";

/**
 * Smallest header size that can carry a single-segment ID packet whose
 * payload begins with the Vorbis or Opus magic. The capture pattern (4) +
 * fixed header (23 more) + segment count (1) + 1 segment-size byte +
 * 8 bytes of magic adds up to 37; using 40 leaves a small safety margin
 * for the version / type / granule fields.
 */
const MIN_DETECT_BYTES = OGG_PAGE_HEADER_FIXED_SIZE + 1 + 1 + OPUS_HEAD_MAGIC.length;

/**
 * Test whether `header` looks like the BOS page of an Ogg Vorbis stream.
 *
 * Both `ogg` and `opus` registrations need to claim the `"OggS"` magic
 * exclusively, so the detect callback must inspect deeper than the capture
 * pattern — the codec is identified by the first packet's payload.
 *
 * @param header - Leading bytes of the file.
 * @returns `true` when the first page carries a Vorbis ID packet.
 */
export const detectOggVorbisSignature = (header: Uint8Array): boolean =>
  hasOggHeader(header) && isFirstPacket(header, isVorbisIdPacket);

/**
 * Test whether `header` looks like the BOS page of an Ogg Opus stream.
 *
 * @param header - Leading bytes of the file.
 * @returns `true` when the first page carries an `OpusHead` packet.
 */
export const detectOggOpusSignature = (header: Uint8Array): boolean =>
  hasOggHeader(header) && isFirstPacket(header, (packet) => startsWith(packet, OPUS_HEAD_MAGIC));

/**
 * Quick check that `header` starts with `"OggS"` and has enough bytes to
 * inspect at least one packet.
 *
 * @param header - Leading bytes of the file.
 * @returns `true` when both conditions hold.
 */
const hasOggHeader = (header: Uint8Array): boolean => {
  if (header.length < MIN_DETECT_BYTES) {
    return false;
  }

  return (
    header[0] === OGG_CAPTURE_PATTERN[0] &&
    header[1] === OGG_CAPTURE_PATTERN[1] &&
    header[2] === OGG_CAPTURE_PATTERN[2] &&
    header[3] === OGG_CAPTURE_PATTERN[3]
  );
};

/**
 * Apply `predicate` to the first packet payload reachable from the BOS page
 * stored in `header`.
 *
 * @param header - Leading file bytes (already vetted by {@link hasOggHeader}).
 * @param predicate - Callback that decides whether the payload matches.
 * @returns `true` when `predicate` accepts the slice; `false` if the packet
 *   is too large to fit in `header` (defensive — real-world ID packets are
 *   well under the 64-byte detection budget).
 */
const isFirstPacket = (header: Uint8Array, predicate: (packet: Uint8Array) => boolean): boolean => {
  const segmentCount = header[OGG_PAGE_HEADER_FIXED_SIZE - 1] ?? 0;
  if (segmentCount === 0) {
    return false;
  }

  const segmentTableEnd = OGG_PAGE_HEADER_FIXED_SIZE + segmentCount;
  const firstSegmentSize = header[OGG_PAGE_HEADER_FIXED_SIZE] ?? 0;
  if (segmentTableEnd + firstSegmentSize > header.length) {
    return false;
  }

  return predicate(header.subarray(segmentTableEnd, segmentTableEnd + firstSegmentSize));
};
