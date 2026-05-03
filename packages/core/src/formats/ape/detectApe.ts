import { APE_FILE_MAGIC } from "./constants.js";

/**
 * Return `true` when `header` starts with the Monkey's Audio `"MAC "` magic.
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 * @returns `true` when the first 4 bytes match the magic.
 */
export const detectApeSignature = (header: Uint8Array): boolean => {
  if (header.length < APE_FILE_MAGIC.length) {
    return false;
  }

  for (let i = 0; i < APE_FILE_MAGIC.length; i++) {
    if (header[i] !== APE_FILE_MAGIC[i]) {
      return false;
    }
  }

  return true;
};
