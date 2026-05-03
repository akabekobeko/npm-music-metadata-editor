import { Buffer } from "node:buffer";
import { decodeExtendedFloat80 } from "./decodeExtendedFloat80.js";

/** Arguments for {@link computeDurationMs}. */
type Args = {
  /** Body bytes after the leading `FORM ... AIFF` / `AIFC` header. */
  body: Uint8Array;
  /** Byte offset (within `body`) where the `COMM` chunk payload starts. */
  commPayloadOffset: number;
  /** Byte length of the `COMM` chunk payload. */
  commPayloadSize: number;
};

/**
 * Compute the audio duration of an AIFF stream from its `COMM` chunk.
 *
 * `COMM` payload layout (big-endian):
 * - `0..1`  i16 — number of channels
 * - `2..5`  u32 — number of sample frames
 * - `6..7`  i16 — sample size
 * - `8..17` extended80 — sample rate
 *
 * `durationMs = sampleFrames / sampleRate × 1000`. Returns `undefined` when
 * the chunk is too short or the sample rate is not positive.
 *
 * @returns Duration in milliseconds, or `undefined` when undeterminable.
 */
export const computeDurationMs = ({
  body,
  commPayloadOffset,
  commPayloadSize,
}: Args): number | undefined => {
  if (commPayloadSize < 18) {
    return undefined;
  }

  const view = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const sampleFrames = view.readUInt32BE(commPayloadOffset + 2);
  const sampleRate = decodeExtendedFloat80(body, commPayloadOffset + 8);
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || sampleFrames === 0) {
    return undefined;
  }

  return Math.round((sampleFrames * 1000) / sampleRate);
};
