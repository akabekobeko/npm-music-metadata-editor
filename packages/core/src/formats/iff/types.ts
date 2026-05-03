/**
 * Byte order used to decode multi-byte chunk size fields.
 *
 * RIFF (`.wav`) is little-endian; AIFF (`.aif`) is big-endian. The legacy
 * `RIFX` variant of WAV is big-endian but Phase 7 does not support it.
 */
export type Endianness = "little" | "big";

/**
 * Top-level chunk descriptor returned by {@link parseChunks}.
 *
 * Offsets are relative to the start of the buffer the chunk was iterated
 * from — typically the bytes after the outer RIFF / FORM header. `size`
 * already includes the chunk header and any trailing pad byte that aligns
 * the next chunk on an even boundary, so `offset + size` directly addresses
 * the next chunk.
 */
export type Chunk = {
  /** 4-character chunk identifier (latin1, e.g. `"fmt "`, `"data"`, `"COMM"`). */
  id: string;
  /** Byte offset of the chunk header (start of the ID) within the source buffer. */
  offset: number;
  /** Total chunk size including the 8-byte header and any pad byte. */
  size: number;
  /** Byte offset where the chunk's payload begins (after the 8-byte header). */
  payloadOffset: number;
  /** Declared payload size in bytes (excludes the optional pad byte). */
  payloadSize: number;
};
