/**
 * Walk backwards over `bytes` skipping aligned `0x00 0x00` pairs.
 *
 * @param bytes - Source bytes to inspect.
 * @returns The exclusive end offset for a UTF-16 payload with terminators removed.
 */
export const trimTrailingUtf16Terminators = (bytes: Uint8Array): number => {
  let end = bytes.length;
  while (end >= 2 && bytes[end - 1] === 0x00 && bytes[end - 2] === 0x00) {
    end -= 2;
  }

  return end;
};
