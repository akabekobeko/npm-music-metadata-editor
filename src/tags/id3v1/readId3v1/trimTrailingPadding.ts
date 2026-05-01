/**
 * Walk backwards over `bytes` skipping ID3v1 padding bytes (`0x00` or space `0x20`).
 *
 * @param bytes - Slice to inspect.
 * @returns The exclusive end offset of the meaningful content.
 */
export const trimTrailingPadding = (bytes: Uint8Array): number => {
  let end = bytes.length;
  while (end > 0) {
    const byte = bytes[end - 1] as number;
    if (byte !== 0x00 && byte !== 0x20) {
      break;
    }

    end -= 1;
  }

  return end;
};
