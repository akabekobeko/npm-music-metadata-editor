import { findMp3AudioHeader } from "../findMp3AudioHeader.js";
import { parseMp3AudioHeader } from "../parseMp3AudioHeader.js";
import { findMp3AudioEnd } from "./findMp3AudioEnd.js";
import { findMp3AudioStart } from "./findMp3AudioStart.js";

/**
 * Estimate the playable duration of an MP3 file from the audio frames.
 *
 * The implementation assumes a constant bit rate (CBR): the duration is
 * `audioBytes × 8 / bitrate` (with bitrate in bits/s). Files encoded with
 * VBR / ABR carry a Xing / Info / VBRI header that is not yet parsed, so the
 * estimate may diverge from the true duration on those streams.
 *
 * Returns `undefined` when no MPEG sync word is found in the audio region or
 * when the parsed bitrate is `0` (free-format streams).
 *
 * @param input - Whole-file MP3 bytes.
 * @returns Estimated duration in milliseconds, or `undefined` when the
 *   bitrate cannot be determined.
 */
export const computeDurationMs = (input: Uint8Array): number | undefined => {
  const audioStart = findMp3AudioStart(input);
  const audioEnd = findMp3AudioEnd(input);
  if (audioEnd <= audioStart) {
    return undefined;
  }

  const headerOffset = findMp3AudioHeader({ bytes: input, startOffset: audioStart });
  if (headerOffset === -1) {
    return undefined;
  }

  const header = parseMp3AudioHeader(input, headerOffset);
  if (header === undefined || header.bitrate === 0) {
    return undefined;
  }

  // `bitrate` is in kbps; `(audioBytes × 8) / (bitrate × 1000) × 1000` simplifies
  // to `audioBytes × 8 / bitrate`.
  const audioBytes = audioEnd - headerOffset;
  return Math.round((audioBytes * 8) / header.bitrate);
};
