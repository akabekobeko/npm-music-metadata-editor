/**
 * Reverse ID3v2 unsynchronisation: every `0xFF 0x00` byte pair is collapsed
 * back to a single `0xFF`.
 *
 * Used both at tag level (when the header flag is set) and at frame level
 * (when the per-frame v2.4 unsync flag is set).
 *
 * @param bytes - Source bytes that may contain `0xFF 0x00` pairs.
 * @returns A new buffer with the inserted `0x00` bytes removed.
 */
export const removeUnsynchronization = (bytes: Uint8Array): Uint8Array => {
  const pairs = countUnsyncPairs(bytes);
  if (pairs === 0) {
    return bytes;
  }

  // Drop every `0x00` that immediately follows a `0xFF` — that is the unsync
  // escape we are undoing. Every other byte is kept.
  return bytes.filter((byte, i) => !(i > 0 && bytes[i - 1] === 0xff && byte === 0x00));
};

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
const countUnsyncPairs = (bytes: Uint8Array): number => {
  let count = 0;
  for (let i = 0; i + 1 < bytes.length; i++) {
    if (bytes[i] === 0xff && bytes[i + 1] === 0x00) {
      count++;
    }
  }

  return count;
};
