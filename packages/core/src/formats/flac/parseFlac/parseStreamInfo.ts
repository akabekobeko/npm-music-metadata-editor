import { Buffer } from "node:buffer";
import { FLAC_STREAMINFO_SIZE } from "../constants.js";
import type { FlacStreamInfo } from "../types.js";

/**
 * Decode a STREAMINFO block body.
 *
 * Bit layout per the FLAC spec (offsets within the 34-byte body):
 * - `0..1` u16BE — minimum block size (samples)
 * - `2..3` u16BE — maximum block size (samples)
 * - `4..6` u24BE — minimum frame size (bytes)
 * - `7..9` u24BE — maximum frame size (bytes)
 * - `10..17` packed 64 bits:
 *   - 20 bits — sample rate (Hz)
 *   - 3 bits — channels minus 1
 *   - 5 bits — bits per sample minus 1
 *   - 36 bits — total samples
 * - `18..33` — MD5 of unencoded audio
 *
 * @param body - The 34-byte STREAMINFO block body (header already consumed).
 * @returns The decoded stream parameters plus a derived `durationMs`.
 * @throws RangeError when `body` is shorter than the spec-mandated 34 bytes.
 */
export const parseStreamInfo = (body: Uint8Array): FlacStreamInfo => {
  if (body.length < FLAC_STREAMINFO_SIZE) {
    throw new RangeError(
      `parseStreamInfo: STREAMINFO body must be ${FLAC_STREAMINFO_SIZE} bytes, got ${body.length}`,
    );
  }

  const view = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const minBlockSize = view.readUInt16BE(0);
  const maxBlockSize = view.readUInt16BE(2);
  const minFrameSize = view.readUIntBE(4, 3);
  const maxFrameSize = view.readUIntBE(7, 3);

  // Bytes 10..17 hold a packed 64-bit field. JavaScript numbers safely cover
  // the 36-bit `totalSamples` value (max < 2^53), so we read individual bytes
  // and shift / mask manually rather than using BigInt.
  // The leading length check guarantees these indices are in range; the
  // `as number` cast satisfies `noUncheckedIndexedAccess` without an `!`.
  const b10 = view[10] as number;
  const b11 = view[11] as number;
  const b12 = view[12] as number;
  const b13 = view[13] as number;
  const sampleRate = (b10 << 12) | (b11 << 4) | (b12 >> 4);
  const channels = ((b12 >> 1) & 0x07) + 1;
  const bitsPerSample = (((b12 & 0x01) << 4) | (b13 >> 4)) + 1;

  // 36-bit `totalSamples`: 4 low bits of byte 13 + bytes 14..17.
  const totalSamplesHigh = b13 & 0x0f;
  const totalSamplesLow = view.readUInt32BE(14);
  // Multiply by 2^32 (avoid `<<` because that operates on 32-bit signed ints).
  const totalSamples = totalSamplesHigh * 0x1_0000_0000 + totalSamplesLow;

  const durationMs = sampleRate > 0 ? Math.round((totalSamples / sampleRate) * 1000) : 0;
  const md5 = body.subarray(18, 34);

  return {
    minBlockSize,
    maxBlockSize,
    minFrameSize,
    maxFrameSize,
    sampleRate,
    channels,
    bitsPerSample,
    totalSamples,
    durationMs,
    md5,
  };
};
