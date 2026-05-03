import { FLAC_SIGNATURE, FLAC_SIGNATURE_SIZE } from "./constants.js";

/**
 * Return `true` when `header` starts with the FLAC `"fLaC"` stream marker.
 *
 * FLAC streams may also begin with an ID3v2 tag, but ID3v2 detection is
 * already owned by the MP3 registration and FLAC files in the wild rarely
 * carry one — we only consider the canonical signature here.
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 * @returns `true` on a match, `false` otherwise.
 */
export const detectFlacSignature = (header: Uint8Array): boolean => {
  if (header.length < FLAC_SIGNATURE_SIZE) {
    return false;
  }

  return (
    header[0] === FLAC_SIGNATURE[0] &&
    header[1] === FLAC_SIGNATURE[1] &&
    header[2] === FLAC_SIGNATURE[2] &&
    header[3] === FLAC_SIGNATURE[3]
  );
};
