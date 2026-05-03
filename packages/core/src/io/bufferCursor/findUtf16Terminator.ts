/**
 * Walk forward over `source` looking for the first aligned 2-byte `0x00 0x00`
 * terminator (UTF-16 family).
 *
 * @param source - Bytes to scan.
 * @param start - Offset to start scanning from. Should be aligned with the UTF-16 code-unit grid.
 * @returns The offset of the terminator, or the position at which scanning stopped
 *   (just past the last full code unit) when no terminator exists.
 */
export const findUtf16Terminator = (source: Uint8Array, start: number): number => {
  let end = start;
  while (end + 1 < source.length) {
    if (source[end] === 0 && source[end + 1] === 0) {
      return end;
    }

    end += 2;
  }

  return end;
};
