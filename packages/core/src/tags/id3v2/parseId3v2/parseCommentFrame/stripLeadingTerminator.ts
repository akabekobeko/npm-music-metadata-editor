/**
 * Some writers leave an extra terminator before the text payload. Strip a
 * single leading terminator when present so the decoder sees clean bytes.
 *
 * @param bytes - Bytes that may begin with a terminator.
 * @param isUtf16 - `true` when the encoding uses 2-byte terminators (UTF-16 family).
 * @returns A view starting after the terminator, or the original bytes when no terminator was present.
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
