import { Buffer } from "node:buffer";
import { OGG_MAX_SEGMENT_SIZE } from "../constants.js";
import type { OggPage } from "../types.js";

/** A packet recovered from one or more Ogg pages. */
export type OggPacket = {
  /** Concatenated packet bytes. */
  data: Uint8Array;
  /** Indexes (within the input page array) of pages that contributed to this packet. */
  pageIndices: readonly number[];
};

/**
 * Reconstruct codec packets from a sequence of Ogg pages belonging to one
 * logical bitstream.
 *
 * Per RFC 3533 §5, a packet is delimited by the *first* lacing segment whose
 * size is `< 255`. This implementation walks every segment of every page in
 * order, accumulating bytes until a terminator (`< 255`) closes the current
 * packet. A trailing partial packet (no terminator before the page run ends)
 * is emitted as-is so callers can decide how to handle it (typically: ignore
 * because the audio packets continue past the header region).
 *
 * @param pages - Pages from a single logical bitstream, in source order.
 * @returns Recovered packets in the order they occur in the bitstream.
 */
export const assemblePackets = (pages: readonly OggPage[]): readonly OggPacket[] => {
  const packets: OggPacket[] = [];
  let currentChunks: Uint8Array[] = [];
  let currentPages: number[] = [];

  pages.forEach((page, pageIndex) => {
    let payloadOffset = 0;
    for (const size of page.segmentSizes) {
      const chunk = page.payload.subarray(payloadOffset, payloadOffset + size);
      payloadOffset += size;

      currentChunks.push(chunk);
      // Only record this page once per packet so callers can locate which
      // pages a packet spans.
      if (currentPages[currentPages.length - 1] !== pageIndex) {
        currentPages.push(pageIndex);
      }

      // A segment shorter than the maximum closes the current packet.
      if (size < OGG_MAX_SEGMENT_SIZE) {
        packets.push({
          data: concatChunks(currentChunks),
          pageIndices: currentPages,
        });
        currentChunks = [];
        currentPages = [];
      }
    }
  });

  if (currentChunks.length > 0) {
    packets.push({
      data: concatChunks(currentChunks),
      pageIndices: currentPages,
    });
  }

  return packets;
};

/**
 * Concatenate a list of byte slices into a single buffer.
 *
 * Returns the input verbatim when there is exactly one chunk, avoiding the
 * `Buffer.concat` allocation in the common single-page-packet case.
 *
 * @param chunks - Byte slices to concatenate, in order.
 * @returns A buffer holding the joined bytes.
 */
const concatChunks = (chunks: readonly Uint8Array[]): Uint8Array => {
  if (chunks.length === 1) {
    return chunks[0] ?? new Uint8Array(0);
  }

  const total = Buffer.concat(chunks);
  return new Uint8Array(total.buffer, total.byteOffset, total.byteLength);
};
