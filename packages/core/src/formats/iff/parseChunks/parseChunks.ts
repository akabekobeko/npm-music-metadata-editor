import { Buffer } from "node:buffer";
import type { Chunk, Endianness } from "../types.js";

/** Bytes consumed by a chunk header (4-byte ID + 4-byte size). */
const HEADER_SIZE = 8;

/** Arguments for {@link parseChunks}. */
type Args = {
  /** Bytes containing a sequence of IFF chunks (i.e. payload after the outer RIFF / FORM header). */
  buffer: Uint8Array;
  /** Byte order used to decode each chunk's size field. */
  endianness: Endianness;
};

/**
 * Iterate the top-level chunks at the start of `buffer`.
 *
 * Each chunk header is 4 bytes of latin1 ID + 4 bytes of size; the size field
 * is interpreted according to `endianness`. Chunks are word-aligned: when a
 * chunk's payload size is odd, the next chunk header begins one byte later
 * to skip the trailing pad byte. Returned `size` already accounts for that.
 *
 * Iteration stops gracefully at the first chunk whose declared size would
 * overflow the buffer, so truncated files yield the chunks that were read
 * before the corruption rather than an exception.
 *
 * @returns Chunks in file order.
 */
export const parseChunks = ({ buffer, endianness }: Args): readonly Chunk[] => {
  const view = Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  const chunks: Chunk[] = [];
  let cursor = 0;

  while (cursor + HEADER_SIZE <= view.length) {
    const id = view.toString("latin1", cursor, cursor + 4);
    const payloadSize =
      endianness === "little" ? view.readUInt32LE(cursor + 4) : view.readUInt32BE(cursor + 4);
    const payloadOffset = cursor + HEADER_SIZE;
    if (payloadOffset + payloadSize > view.length) {
      break;
    }

    const padding = payloadSize % 2;
    chunks.push({
      id,
      offset: cursor,
      size: HEADER_SIZE + payloadSize + padding,
      payloadOffset,
      payloadSize,
    });
    cursor = payloadOffset + payloadSize + padding;
  }

  return chunks;
};
