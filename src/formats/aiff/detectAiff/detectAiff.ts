import {
  AIFF_FORM_TYPE_AIFC,
  AIFF_FORM_TYPE_AIFF,
  AIFF_HEADER_SIZE,
  AIFF_MAGIC_FORM,
} from "../constants.js";
import { matchesAt } from "./matchesAt.js";

/**
 * Return `true` when `header` starts with a `FORM ... AIFF` or
 * `FORM ... AIFC` outer container.
 *
 * @param header - Leading bytes of the file (typically up to 64 bytes).
 * @returns `true` when the leading 12 bytes spell either AIFF flavour.
 */
export const detectAiffSignature = (header: Uint8Array): boolean => {
  if (header.length < AIFF_HEADER_SIZE) {
    return false;
  }

  if (!matchesAt({ bytes: header, offset: 0, expected: AIFF_MAGIC_FORM })) {
    return false;
  }

  return (
    matchesAt({ bytes: header, offset: 8, expected: AIFF_FORM_TYPE_AIFF }) ||
    matchesAt({ bytes: header, offset: 8, expected: AIFF_FORM_TYPE_AIFC })
  );
};
