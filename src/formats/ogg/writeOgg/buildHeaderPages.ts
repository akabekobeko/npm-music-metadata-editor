import { Buffer } from "node:buffer";
import { OGG_MAX_SEGMENTS_PER_PAGE, OggHeaderType } from "../constants.js";
import { chunkIntoSegments } from "../packet/chunkIntoSegments.js";
import { encodeOggPage } from "../page/encodeOggPage.js";

/** Arguments for {@link buildHeaderPages}. */
type Args = {
  /**
   * Packets to page (in order). For Vorbis this is `[comment, setup]`; for
   * Opus this is `[comment]`.
   */
  packets: readonly Uint8Array[];
  /** Logical bitstream serial number to embed in every page header. */
  serialNumber: number;
  /** Page sequence number assigned to the first emitted page. */
  startPageSequence: number;
};

/**
 * Re-page one or more codec packets into Ogg pages.
 *
 * Concatenates each packet's lacing values into a single stream of segments,
 * groups them into pages of at most {@link OGG_MAX_SEGMENTS_PER_PAGE}
 * segments each, and emits the corresponding page bytes. The header pages
 * always carry granule position `0` (per RFC 7845 / Vorbis I, header pages
 * have not produced any decoded samples yet).
 *
 * Continuation pages set the `continuation` bit in `header_type`; the very
 * first emitted page does not (its packet starts at the page boundary).
 *
 * @returns The encoded page bytes in order.
 */
export const buildHeaderPages = ({
  packets,
  serialNumber,
  startPageSequence,
}: Args): readonly Uint8Array[] => {
  // Flatten packets into a single (segments, payloadChunks) stream — every
  // packet contributes its lacing values plus the underlying bytes.
  const segments: number[] = [];
  const payloadChunks: Uint8Array[] = [];
  for (const packet of packets) {
    const packetSegments = chunkIntoSegments(packet.length);
    segments.push(...packetSegments);
    payloadChunks.push(packet);
  }

  const payload = concatPayload(payloadChunks);

  const pages: Uint8Array[] = [];
  let segmentPos = 0;
  let payloadPos = 0;
  let pageSequence = startPageSequence;
  let isContinuation = false;

  while (segmentPos < segments.length) {
    const segmentEnd = Math.min(segmentPos + OGG_MAX_SEGMENTS_PER_PAGE, segments.length);
    const pageSegments = segments.slice(segmentPos, segmentEnd);
    const pagePayloadSize = pageSegments.reduce((sum, size) => sum + size, 0);
    const pagePayload = payload.subarray(payloadPos, payloadPos + pagePayloadSize);

    pages.push(
      encodeOggPage({
        headerType: isContinuation ? OggHeaderType.Continuation : 0,
        granulePosition: 0n,
        serialNumber,
        pageSequence,
        segmentSizes: pageSegments,
        payload: pagePayload,
      }),
    );

    segmentPos = segmentEnd;
    payloadPos += pagePayloadSize;
    pageSequence += 1;
    isContinuation = true;
  }

  return pages;
};

/**
 * Concatenate packet payloads into one buffer.
 *
 * Returns the single chunk verbatim when there is only one (the Opus case
 * with a lone comment packet) to avoid an extra allocation.
 *
 * @param chunks - Payload bytes per packet, in order.
 * @returns A buffer holding the joined payload.
 */
const concatPayload = (chunks: readonly Uint8Array[]): Uint8Array => {
  if (chunks.length === 1) {
    return chunks[0] ?? new Uint8Array(0);
  }

  const total = Buffer.concat(chunks);
  return new Uint8Array(total.buffer, total.byteOffset, total.byteLength);
};
