import { Buffer } from "node:buffer";
import { APE_COMMON_HEADER_SIZE, APE_OLD_HEADER_SIZE } from "../constants.js";
import type { ApeAudioInfo } from "../types.js";

/** Format-flag bits used by the legacy header (versions ≤ 3.97). */
const OLD_FLAG_8_BIT = 0x01;
const OLD_FLAG_24_BIT = 0x08;

/** Compression level value for "extra high" (used to derive blocks-per-frame). */
const COMPRESSION_EXTRA_HIGH = 4000;

/**
 * Parse the legacy Monkey's Audio header layout (versions ≤ 3.97).
 *
 * Byte layout after the common 6-byte (`"MAC "` + version) prefix:
 * `compressionLevel:u16le + formatFlags:u16le + channels:u16le +
 *  sampleRate:u32le + headerBytes:u32le + terminatingBytes:u32le +
 *  totalFrames:u32le + finalFrameBlocks:u32le + reserved:u32le`.
 *
 * @param input - Whole-file bytes.
 * @param version - Version number already extracted from the common header.
 * @returns Decoded audio info, or `undefined` when the buffer is too short.
 */
export const parseOldHeader = (input: Uint8Array, version: number): ApeAudioInfo | undefined => {
  if (input.length < APE_COMMON_HEADER_SIZE + APE_OLD_HEADER_SIZE) {
    return undefined;
  }

  const view = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  const compressionLevel = view.readUInt16LE(APE_COMMON_HEADER_SIZE);
  const formatFlags = view.readUInt16LE(APE_COMMON_HEADER_SIZE + 2);
  const channels = view.readUInt16LE(APE_COMMON_HEADER_SIZE + 4);
  const sampleRate = view.readUInt32LE(APE_COMMON_HEADER_SIZE + 6);
  // Skip headerBytes, terminatingBytes (2 × u32le).
  const totalFrames = view.readUInt32LE(APE_COMMON_HEADER_SIZE + 18);
  const finalFrameBlocks = view.readUInt32LE(APE_COMMON_HEADER_SIZE + 22);

  const bitsPerSample = resolveBitsPerSample(formatFlags);
  const blocksPerFrame = resolveBlocksPerFrame({ version, compressionLevel });
  const totalSamples = totalFrames > 0 ? (totalFrames - 1) * blocksPerFrame + finalFrameBlocks : 0;
  const durationMs = sampleRate > 0 ? (totalSamples * 1000) / sampleRate : 0;

  return {
    version,
    sampleRate,
    channels,
    bitsPerSample,
    totalSamples,
    durationMs,
    compressionLevel,
  };
};

/**
 * Derive the bit depth from the legacy header's format flags.
 *
 * Default is 16-bit; `8_BIT` and `24_BIT` flags override when set.
 *
 * @param formatFlags - Raw `nFormatFlags` 16-bit value.
 * @returns Bits per sample.
 */
const resolveBitsPerSample = (formatFlags: number): number => {
  if ((formatFlags & OLD_FLAG_24_BIT) !== 0) {
    return 24;
  }

  if ((formatFlags & OLD_FLAG_8_BIT) !== 0) {
    return 8;
  }

  return 16;
};

/** Arguments for {@link resolveBlocksPerFrame}. */
type Args = {
  /** Raw header version (e.g. `3970` for 3.97). */
  version: number;
  /** Compression level reported by the header. */
  compressionLevel: number;
};

/**
 * Reproduce MAC SDK 3.97's blocks-per-frame heuristic for the legacy header.
 *
 * Newer files (≥ 3.95) use `73728 * 4`; mid-era files (≥ 3.90 or 3.80 +
 * extra-high) use `73728`; everything older uses `9216`.
 *
 * @returns Blocks-per-frame value used to compute `totalSamples`.
 */
const resolveBlocksPerFrame = ({ version, compressionLevel }: Args): number => {
  if (version >= 3950) {
    return 73728 * 4;
  }

  if (version >= 3900 || (version >= 3800 && compressionLevel === COMPRESSION_EXTRA_HIGH)) {
    return 73728;
  }

  return 9216;
};
