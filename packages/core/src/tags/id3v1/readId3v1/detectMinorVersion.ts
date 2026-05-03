/**
 * Determine whether the trailer is an ID3v1.0 or ID3v1.1 layout.
 *
 * @param trailer - The 128-byte trailing slice that already passed the magic check.
 * @returns `1` for ID3v1.1 (track number byte present), otherwise `0`.
 */
export const detectMinorVersion = (trailer: Uint8Array): 0 | 1 => {
  const sep = trailer[125] as number;
  const candidate = trailer[126] as number;
  // ID3v1.1 marker: byte 125 is 0x00 separator and byte 126 is a non-zero track number.
  // Some legacy writers use 0x20 (' ') as the separator before a non-space track byte.
  if ((sep === 0x00 && candidate !== 0) || (sep === 0x20 && candidate !== 0x20)) {
    return 1;
  }

  return 0;
};
