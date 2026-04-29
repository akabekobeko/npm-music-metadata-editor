/**
 * Some writers leave an extra terminator before the text payload. Strip a
 * single leading terminator when present so the decoder sees clean bytes.
 */
export const stripLeadingTerminator = (bytes: Uint8Array, isUtf16: boolean): Uint8Array => {
  if (isUtf16 && bytes.length >= 2 && bytes[0] === 0x00 && bytes[1] === 0x00) {
    return bytes.subarray(2);
  }

  if (!isUtf16 && bytes.length >= 1 && bytes[0] === 0x00) {
    return bytes.subarray(1);
  }

  return bytes;
};
