/**
 * Count `0xFF 0x00` byte pairs inside `bytes`.
 *
 * Pulled out of {@link removeUnsynchronization} so the main function can use a
 * `const` for the count without dragging an indexed `reduce` callback (which
 * would violate `useMaxParams`).
 *
 * @param bytes - Bytes to scan.
 * @returns The number of escape pairs found.
 */
export const countUnsyncPairs = (bytes: Uint8Array): number => {
  let count = 0;
  for (let i = 0; i + 1 < bytes.length; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0x00) {
      count++;
    }
  }

  return count;
};
