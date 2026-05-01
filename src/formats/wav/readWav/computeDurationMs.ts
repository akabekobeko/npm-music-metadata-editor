import { Buffer } from "node:buffer";

/** Arguments for {@link computeDurationMs}. */
type Args = {
  /** Body bytes after the leading `RIFF...WAVE` header (chunks live here). */
  body: Uint8Array;
  /** Byte offset (within `body`) where the `fmt ` chunk payload starts. */
  fmtPayloadOffset: number;
  /** Byte length of the `fmt ` chunk payload. */
  fmtPayloadSize: number;
  /** Byte length of the `data` chunk payload (audio samples). */
  dataPayloadSize: number;
};

/**
 * Compute the audio duration of a WAV stream from its `fmt ` and `data`
 * chunks.
 *
 * Uses the `byte rate` field at offset 8 of the `fmt ` payload (bytes per
 * second of audio) divided into the `data` chunk size. Works for plain PCM
 * as well as any container-encoded variant that populates `byte rate`
 * correctly. Returns `undefined` when the inputs cannot yield a positive
 * duration (missing chunks, zero rate, etc.).
 *
 * @returns Duration in milliseconds, or `undefined` when undeterminable.
 */
export const computeDurationMs = ({
  body,
  fmtPayloadOffset,
  fmtPayloadSize,
  dataPayloadSize,
}: Args): number | undefined => {
  if (fmtPayloadSize < 16 || dataPayloadSize <= 0) {
    return undefined;
  }

  const view = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  const byteRate = view.readUInt32LE(fmtPayloadOffset + 8);
  if (byteRate === 0) {
    return undefined;
  }

  return Math.round((dataPayloadSize * 1000) / byteRate);
};
