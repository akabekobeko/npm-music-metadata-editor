/**
 * Return a view of `bytes` with every trailing `0x00` byte removed.
 *
 * `LIST/INFO` entries store text as null-terminated UTF-8, but writers in
 * the wild are inconsistent about how many null bytes they emit (one for
 * the terminator, sometimes a second one for word alignment, occasionally a
 * few extra). Trimming them all keeps invisible NUL characters out of the
 * decoded string regardless of which writer produced the file.
 *
 * @param bytes - Bytes to trim. Not mutated.
 * @returns A zero-copy `subarray` view ending before the trailing nulls.
 */
export const stripTrailingNulls = (bytes: Uint8Array): Uint8Array => {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) {
    end--;
  }

  return bytes.subarray(0, end);
};
