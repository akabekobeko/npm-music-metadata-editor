/** Find the first `0x00 0x00` aligned pair (UTF-16 terminator) and slice up to it. */
export const splitFirstUtf16 = (bytes: Uint8Array): Uint8Array => {
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
      return bytes.subarray(0, i);
    }
  }

  return bytes;
};
