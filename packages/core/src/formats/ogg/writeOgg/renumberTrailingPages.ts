import { Buffer } from "node:buffer";
import { OGG_CRC_OFFSET } from "../constants.js";
import { crc32Ogg } from "../page/crc32.js";
import type { OggPage } from "../types.js";

/** Arguments for {@link renumberTrailingPages}. */
type Args = {
  /** Source bytes the original trailing pages came from. */
  source: Uint8Array;
  /** Trailing pages (typically: audio pages) in their original order. */
  pages: readonly OggPage[];
  /** Page sequence number to assign to the first trailing page. */
  startPageSequence: number;
  /** Logical bitstream serial number to filter pages on. */
  serialNumber: number;
};

/**
 * Re-emit a run of trailing pages with updated page sequence numbers and
 * recomputed CRC32 checksums.
 *
 * Pages whose `serialNumber` differs from `serialNumber` (e.g. interleaved
 * streams in a multiplex file) pass through unchanged. We only renumber and
 * recrc the audio stream we edited.
 *
 * @returns Page bytes ready to splice back into the file.
 */
export const renumberTrailingPages = ({
  source,
  pages,
  startPageSequence,
  serialNumber,
}: Args): Uint8Array => {
  let nextSequence = startPageSequence;
  const buffers = pages.map((page) => {
    const original = source.subarray(page.pageStart, page.pageStart + page.pageSize);
    if (page.serialNumber !== serialNumber) {
      // Page belongs to another logical bitstream — preserve verbatim.
      return original;
    }

    const rewritten = Buffer.from(original);
    rewritten.writeUInt32LE(nextSequence, 18);
    // Reset CRC, recompute, then patch.
    rewritten.writeUInt32LE(0, OGG_CRC_OFFSET);
    const crc = crc32Ogg(rewritten);
    rewritten.writeUInt32LE(crc, OGG_CRC_OFFSET);
    nextSequence += 1;
    return new Uint8Array(rewritten.buffer, rewritten.byteOffset, rewritten.byteLength);
  });

  const total = Buffer.concat(buffers);
  return new Uint8Array(total.buffer, total.byteOffset, total.byteLength);
};
