import { Buffer } from "node:buffer";

/**
 * Compute the audio duration of a WMA / ASF stream from its File Properties
 * Object payload.
 *
 * Field layout within the payload (after the 24-byte object header):
 * - `0..15`  File ID GUID
 * - `16..23` File Size (u64)
 * - `24..31` Creation Date (u64)
 * - `32..39` Data Packets Count (u64)
 * - `40..47` Play Duration (u64, in 100-ns units)
 * - `48..55` Send Duration (u64)
 * - `56..63` Preroll (u64, in milliseconds)
 *
 * `durationMs = playDuration / 10000 - preroll`. `playDuration` is in
 * 100-nanosecond units (10000 = 1 ms); `preroll` covers buffering before
 * playback begins and is already in milliseconds.
 *
 * @param payload - File Properties Object payload (header excluded).
 * @returns Duration in milliseconds, or `undefined` when the payload is too
 *   short or the computed value is non-positive.
 */
export const computeDurationMs = (payload: Uint8Array): number | undefined => {
  if (payload.length < 64) {
    return undefined;
  }

  const view = Buffer.from(payload.buffer, payload.byteOffset, payload.byteLength);
  const playDuration = Number(view.readBigUInt64LE(40));
  const preroll = Number(view.readBigUInt64LE(56));
  const durationMs = Math.round(playDuration / 10000) - preroll;
  return durationMs > 0 ? durationMs : undefined;
};
