/**
 * Walk forward over `source` looking for the first single-byte `0x00` terminator.
 *
 * @param source - Bytes to scan.
 * @param start - Offset to start scanning from.
 * @returns The offset of the terminator, or `source.length` when no terminator exists.
 */
export const findSingleByteTerminator = (source: Uint8Array, start: number): number => {
  let end = start;
  while (end < source.length && source[end] !== 0) {
    end++;
  }

  return end;
};
