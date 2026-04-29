import { decodeText } from "../../../../utils/encoding/decodeText.js";
import { ENCODING_BY_BYTE, isMultiByteEncoding } from "./encodingByteMap.js";
import { splitFirstSingleByte } from "./splitFirstSingleByte.js";
import { splitFirstUtf16 } from "./splitFirstUtf16.js";
import { stripTerminator } from "./stripTerminator.js";

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
