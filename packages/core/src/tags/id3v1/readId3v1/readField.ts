import { decodeText } from "../../../utils/encoding/decodeText.js";
import { trimTrailingPadding } from "./trimTrailingPadding.js";

/** Arguments for {@link readField}. */
type Args = {
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
export const readField = ({ trailer, offset, length }: Args): string => {
  const slice = trailer.subarray(offset, offset + length);
  const end = trimTrailingPadding(slice);
  return decodeText(slice.subarray(0, end), "latin1");
};
