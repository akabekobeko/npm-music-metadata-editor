import { FLAC_SIGNATURE, FLAC_SIGNATURE_SIZE } from "../constants.js";

/**
 * Verify the leading `"fLaC"` marker is present.
 *
 * @param input - Whole-file bytes.
 * @throws Error when the signature does not match.
 */
export const checkSignature = (input: Uint8Array): void => {
  const ok =
    input.length >= FLAC_SIGNATURE_SIZE &&
    input[0] === FLAC_SIGNATURE[0] &&
    input[1] === FLAC_SIGNATURE[1] &&
    input[2] === FLAC_SIGNATURE[2] &&
    input[3] === FLAC_SIGNATURE[3];
  if (!ok) {
    throw new Error('parseFlac: missing "fLaC" stream marker');
  }
};
