/**
 * Walk backwards over `bytes` skipping single trailing `0x00` bytes.
 *
 * @param bytes - Source bytes to inspect.
 * @returns The exclusive end offset for a single-byte payload with terminators removed.
 */
export const trimTrailingZeroBytes = (bytes: Uint8Array): number => {
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0x00) {
    end -= 1;
  }

  return end;
};
