/** Find the first `0x00` byte (single-byte encoding terminator) and slice up to it. */
export const splitFirstSingleByte = (bytes: Uint8Array): Uint8Array => {
  const idx = bytes.indexOf(0x00);
  return idx === -1 ? bytes : bytes.subarray(0, idx);
};
