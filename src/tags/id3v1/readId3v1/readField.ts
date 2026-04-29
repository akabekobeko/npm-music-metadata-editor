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
  const end = trimTrailingPadding(slice);
  return decodeText(slice.subarray(0, end), "latin1");
};

/**
 * Walk backwards over `bytes` skipping ID3v1 padding bytes (`0x00` or space `0x20`).
 *
 * @param bytes - Slice to inspect.
 * @returns The exclusive end offset of the meaningful content.
 */
const trimTrailingPadding = (bytes: Uint8Array): number => {
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
