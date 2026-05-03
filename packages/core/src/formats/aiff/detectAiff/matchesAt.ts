/** Arguments for {@link matchesAt}. */
type Args = {
  /** Bytes to inspect. */
  bytes: Uint8Array;
  /** Absolute offset within `bytes` to start the comparison. */
  offset: number;
  /** Reference bytes to compare against. */
  expected: Uint8Array;
};

/**
 * Compare a slice of `bytes` starting at `offset` against `expected`.
 *
 * Used by the AIFF signature check to test the magic and form-type fields
 * without copying memory; written as a small standalone helper because the
 * detector needs to apply it at multiple offsets within the same header.
 *
 * @returns `true` when every byte of `expected` matches the same-position
 *   byte of `bytes` (out-of-range reads are treated as a mismatch).
 */
export const matchesAt = ({ bytes, offset, expected }: Args): boolean => {
  for (let i = 0; i < expected.length; i++) {
    if (bytes[offset + i] !== expected[i]) {
      return false;
    }
  }

  return true;
};
