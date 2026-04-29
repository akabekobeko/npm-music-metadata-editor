import { decodeText, type TextEncoding } from "../../../utils/encoding.js";

/** Map an ID3v2 encoding byte to the encoding name accepted by `decodeText`. */
const ENCODING_BY_BYTE: Readonly<Record<number, TextEncoding>> = {
  0: "latin1",
  1: "utf16",
  2: "utf16be",
  3: "utf8",
};

/**
 * Decode the body of a text-information frame (`T*`).
 *
 * The first byte is the encoding selector (0=Latin-1, 1=UTF-16 BOM, 2=UTF-16BE,
 * 3=UTF-8). The remainder is the text payload. Trailing terminator bytes are
 * stripped. ID3v2.4 supports multi-value frames with `0x00` separators; we
 * return the **first** value to keep the high-level API single-valued.
 *
 * @param body - Frame body bytes.
 * @returns The decoded string, or `undefined` when the body is empty / malformed.
 */
export const parseTextFrame = (body: Uint8Array): string | undefined => {
  if (body.length < 1) {
    return undefined;
  }

  const encoding = ENCODING_BY_BYTE[body[0] as number];
  if (encoding === undefined) {
    return undefined;
  }

  const payload = stripTerminator(body.subarray(1), encoding);
  const firstValue = isMultiByteEncoding(encoding)
    ? splitFirstUtf16(payload)
    : splitFirstSingleByte(payload);
  return decodeText(firstValue, encoding);
};

/** Detect whether the encoding uses 2-byte code units (UTF-16 family). */
const isMultiByteEncoding = (encoding: TextEncoding): boolean =>
  encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";

/** Slice off any trailing null terminator(s). */
const stripTerminator = (bytes: Uint8Array, encoding: TextEncoding): Uint8Array => {
  if (isMultiByteEncoding(encoding)) {
    let end = bytes.length;
    while (end >= 2 && bytes[end - 1] === 0x00 && bytes[end - 2] === 0x00) {
      end -= 2;
    }

    return bytes.subarray(0, end);
  }

  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0x00) {
    end -= 1;
  }

  return bytes.subarray(0, end);
};

/** Find the first `0x00` byte (single-byte encoding terminator) and slice up to it. */
const splitFirstSingleByte = (bytes: Uint8Array): Uint8Array => {
  const idx = bytes.indexOf(0x00);
  return idx === -1 ? bytes : bytes.subarray(0, idx);
};

/** Find the first `0x00 0x00` aligned pair (UTF-16 terminator) and slice up to it. */
const splitFirstUtf16 = (bytes: Uint8Array): Uint8Array => {
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
      return bytes.subarray(0, i);
    }
  }

  return bytes;
};
