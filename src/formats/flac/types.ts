import type { VorbisComment } from "../../tags/vorbisComment/types.js";
import type { PictureInfo } from "../../types.js";

/**
 * STREAMINFO block (always present, always first).
 *
 * Field layout follows the FLAC format specification.
 */
export type FlacStreamInfo = {
  /** Minimum block size used in the stream, in samples. */
  minBlockSize: number;
  /** Maximum block size used in the stream, in samples. */
  maxBlockSize: number;
  /** Minimum frame size in bytes (`0` when unknown). */
  minFrameSize: number;
  /** Maximum frame size in bytes (`0` when unknown). */
  maxFrameSize: number;
  /** Sample rate in Hz (`1..655350`). */
  sampleRate: number;
  /** Channel count (`1..8`). */
  channels: number;
  /** Bits per sample (`4..32`). */
  bitsPerSample: number;
  /** Total number of samples (`0` when unknown). 36-bit value, fits in `number`. */
  totalSamples: number;
  /** Stream duration in milliseconds (derived from `totalSamples / sampleRate`). */
  durationMs: number;
  /** MD5 of the unencoded audio data (16 bytes; all zero when unset). */
  md5: Uint8Array;
};

/**
 * One metadata block kept verbatim during read so the writer can re-emit it.
 *
 * `data` does *not* include the 4-byte block header; the writer reconstructs
 * the header from `type` plus `data.length` and applies the `is_last` flag
 * based on the block's position.
 */
export type FlacBlock = {
  /** Block type (`0..6`). Unknown / reserved values are passed through. */
  type: number;
  /** Block body bytes (excludes the 4-byte header). */
  data: Uint8Array;
};

/**
 * Decoded picture metadata from a `PICTURE` block.
 *
 * Mirrors the structure used inside the Vorbis `METADATA_BLOCK_PICTURE`
 * convention, plus the dimensions / colour info FLAC also stores.
 */
export type FlacPicture = {
  /** Picture role / kind (matches ID3v2 APIC numeric type). */
  pictureType: number;
  /** MIME type string (`"image/jpeg"`, `"image/png"`, ...). */
  mimeType: string;
  /** Free-form description (often empty). */
  description: string;
  /** Width in pixels (informational; `0` when unknown). */
  width: number;
  /** Height in pixels (informational; `0` when unknown). */
  height: number;
  /** Colour depth in bits per pixel (informational; `0` when unknown). */
  colorDepth: number;
  /** Number of palette colours for indexed images (informational; `0` otherwise). */
  colorNum: number;
  /** Raw image bytes. */
  data: Uint8Array;
};

/**
 * Result of parsing the metadata region of a FLAC file.
 *
 * `audioOffset` points one byte past the last metadata block — i.e. the start
 * of the audio frames. The writer uses this together with the original
 * metadata-region size to decide whether the audio payload needs to shift.
 */
export type ParsedFlac = {
  /** Decoded STREAMINFO. */
  streamInfo: FlacStreamInfo;
  /** Decoded Vorbis Comment, or `undefined` when no `VORBIS_COMMENT` block exists. */
  vorbisComment?: VorbisComment;
  /** Decoded `PICTURE` blocks, in file order. */
  pictures: readonly FlacPicture[];
  /**
   * Non-padding, non-VorbisComment, non-Picture blocks captured verbatim so
   * the writer can pass them through (STREAMINFO is included as block index 0).
   */
  passThroughBlocks: readonly FlacBlock[];
  /** Offset to the first audio frame (i.e. end of the metadata region). */
  audioOffset: number;
  /** Total byte length of the metadata region, including the `"fLaC"` marker. */
  metadataRegionSize: number;
};

/**
 * Picture data used by the FLAC writer when synthesizing `PICTURE` blocks.
 *
 * This is a strict subset of {@link PictureInfo}: the writer needs the bytes
 * + a few descriptive fields, but `width` / `height` / `colorDepth` are
 * optional (the writer falls back to `0` when omitted).
 */
export type FlacWritablePicture = Pick<PictureInfo, "mimeType" | "description" | "data"> & {
  /** ID3v2 APIC numeric picture type (e.g. `3` for cover front). */
  pictureType: number;
  /** Width in pixels. */
  width?: number;
  /** Height in pixels. */
  height?: number;
  /** Colour depth in bits per pixel. */
  colorDepth?: number;
  /** Palette size for indexed images. */
  colorNum?: number;
};
