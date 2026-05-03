import { Buffer } from "node:buffer";
import { APE_COMMON_HEADER_SIZE, APE_DESCRIPTOR_SIZE, APE_NEW_HEADER_SIZE } from "../constants.js";
import type { ApeAudioInfo } from "../types.js";

/**
 * Parse the modern Monkey's Audio header layout (versions ≥ 3.98).
 *
 * The byte sequence after the common 6-byte (`"MAC "` + version) prefix is:
 * `descriptor (52 bytes) + new header (24 bytes) + seek table + ...`. We only
 * read what is required to populate {@link ApeAudioInfo}.
 *
 * @param input - Whole-file bytes.
 * @param version - Version number already extracted from the common header.
 * @returns Decoded audio info, or `undefined` when the buffer is too short.
 */
export const parseNewHeader = (input: Uint8Array, version: number): ApeAudioInfo | undefined => {
  const requiredLength = APE_COMMON_HEADER_SIZE + APE_DESCRIPTOR_SIZE + APE_NEW_HEADER_SIZE;
  if (input.length < requiredLength) {
    return undefined;
  }

  const view = Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  // Descriptor lives at [common, common + 52). We only read fields we care
  // about — `nDescriptorBytes` may extend further on future MAC SDK revisions.
  const descriptorBytes = view.readUInt32LE(APE_COMMON_HEADER_SIZE + 2);
  const headerOffset = APE_COMMON_HEADER_SIZE + Math.max(descriptorBytes, APE_DESCRIPTOR_SIZE);
  if (input.length < headerOffset + APE_NEW_HEADER_SIZE) {
    return undefined;
  }

  const compressionLevel = view.readUInt16LE(headerOffset);
  // Skip nFormatFlags (2 bytes) at headerOffset + 2.
  const blocksPerFrame = view.readUInt32LE(headerOffset + 4);
  const finalFrameBlocks = view.readUInt32LE(headerOffset + 8);
  const totalFrames = view.readUInt32LE(headerOffset + 12);
  const bitsPerSample = view.readUInt16LE(headerOffset + 16);
  const channels = view.readUInt16LE(headerOffset + 18);
  const sampleRate = view.readUInt32LE(headerOffset + 20);

  const totalSamples = totalFrames > 0 ? blocksPerFrame * (totalFrames - 1) + finalFrameBlocks : 0;
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
