import type { Buffer } from "node:buffer";
import { encodeText } from "../../../utils/encoding/encodeText.js";

/** Arguments for {@link writeFixed}. */
type Args = {
  /** Destination buffer. */
  out: Buffer;
  /** Byte offset within `out` where the field starts. */
  offset: number;
  /** Field length in bytes. */
  length: number;
  /** Value to encode (Latin-1). */
  value: string;
};

/**
 * Latin-1 encode `value`, truncate to `length` bytes, and copy into `out` at `offset`.
 * Remaining bytes in the field are left as the buffer's existing zero padding.
 */
export const writeFixed = ({ out, offset, length, value }: Args): void => {
  if (value === "") {
    return;
  }

  const encoded = encodeText(value, "latin1");
  const copyLength = Math.min(encoded.length, length);
  out.set(encoded.subarray(0, copyLength), offset);
};
