import {
  AIFF_FORM_TYPE_AIFC,
  AIFF_FORM_TYPE_AIFF,
  AIFF_HEADER_SIZE,
  AIFF_MAGIC_FORM,
} from "./constants.js";

/** Arguments for {@link matchesAt}. */
type MatchesAtArgs = {
  /** Bytes to inspect. */
  bytes: Uint8Array;
  /** Absolute offset within `bytes` to start the comparison. */
  offset: number;
  /** Reference bytes to compare against. */
  expected: Uint8Array;
};

/** Compare a slice of `bytes` starting at `offset` against `expected`. */
const matchesAt = ({ bytes, offset, expected }: MatchesAtArgs): boolean => {
  for (let i = 0; i < expected.length; i++) {
    if (bytes[offset + i] !== expected[i]) {
      return false;
    }
  }

  return true;
};

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
