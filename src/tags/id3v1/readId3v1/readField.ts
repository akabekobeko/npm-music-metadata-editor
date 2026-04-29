import { decodeText } from "../../../utils/encoding/decodeText.js";

/** Arguments for {@link readField}. */
export type ReadFieldArgs = {
  /** The 128-byte trailer slice. */
  trailer: Uint8Array;
  /** Byte offset within `trailer` where the field starts. */
  offset: number;
  /** Field length in bytes. */
  length: number;
};

/**
 * Decode a fixed-length Latin-1 field, trimming trailing null and space padding.
 *
 * @returns The decoded string with trailing padding stripped.
 */
export const readField = (args: ReadFieldArgs): string => {
  const { trailer, offset, length } = args;
  const slice = trailer.subarray(offset, offset + length);
  let end = slice.length;
  while (end > 0) {
    const byte = slice[end - 1] as number;
    if (byte !== 0x00 && byte !== 0x20) {
      break;
    }

    end -= 1;
  }

  return decodeText(slice.subarray(0, end), "latin1");
};
