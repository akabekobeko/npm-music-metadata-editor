import { WAV_FORM_TYPE, WAV_HEADER_SIZE, WAV_MAGIC_RIFF } from "./constants.js";

/**
 * Return `true` when `header` starts with a `RIFF ... WAVE` outer container.
 *
 * The RIFX (big-endian RIFF) variant is intentionally not accepted;
 * production WAV files in the wild are little-endian.
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 * @returns `true` when the leading 12 bytes spell `RIFF<size>WAVE`.
 */
export const detectWavSignature = (header: Uint8Array): boolean => {
  if (header.length < WAV_HEADER_SIZE) {
    return false;
  }

  for (let i = 0; i < WAV_MAGIC_RIFF.length; i++) {
    if (header[i] !== WAV_MAGIC_RIFF[i]) {
      return false;
    }
  }

  for (let i = 0; i < WAV_FORM_TYPE.length; i++) {
    if (header[8 + i] !== WAV_FORM_TYPE[i]) {
      return false;
    }
  }

  return true;
};
