import { decodeText } from "../../../utils/encoding/decodeText.js";
import {
  ENCODING_BY_BYTE,
  isMultiByteEncoding,
} from "../parseId3v2/parseTextFrame/encodingByteMap.js";
import { stripTerminator } from "../parseId3v2/parseTextFrame/stripTerminator.js";

/**
 * Decode the body of an involved-people frame (`TIPL` / `IPLS`).
 *
 * The body is `<encoding-byte:1><string-list...>` where the list alternates
 * role and person name, each string terminated by `0x00` (or `0x00 0x00` for
 * UTF-16). Unlike {@link parseTextFrame} every value is returned, because the
 * pairs only make sense as a whole.
 *
 * @param body - Frame body bytes.
 * @returns The decoded strings in frame order (`[role, name, role, name, ...]`).
 *   Empty when the body is empty / malformed.
 */
export const parseInvolvedPeopleFrame = (body: Uint8Array): string[] => {
  if (body.length < 1) {
    return [];
  }

  const encoding = ENCODING_BY_BYTE[body[0] as number];
  if (encoding === undefined) {
    return [];
  }

  const payload = stripTerminator(body.subarray(1), encoding);
  if (payload.length === 0) {
    return [];
  }

  const segments = isMultiByteEncoding(encoding) ? splitUtf16(payload) : splitSingleByte(payload);
  return segments.map((segment) => decodeText(segment, encoding));
};

/**
 * Split a single-byte-encoded payload on every `0x00` separator.
 *
 * @param bytes - Payload with the trailing terminator already stripped.
 * @returns Views over each value, in order.
 */
const splitSingleByte = (bytes: Uint8Array): Uint8Array[] => {
  const out: Uint8Array[] = [];
  let start = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x00) {
      out.push(bytes.subarray(start, i));
      start = i + 1;
    }
  }

  out.push(bytes.subarray(start));
  return out;
};

/**
 * Split a UTF-16 payload on every aligned `0x00 0x00` separator pair.
 *
 * @param bytes - Payload with the trailing terminator already stripped.
 * @returns Views over each value, in order.
 */
const splitUtf16 = (bytes: Uint8Array): Uint8Array[] => {
  const out: Uint8Array[] = [];
  let start = 0;
  for (let i = 0; i + 1 < bytes.length; i += 2) {
    if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
      out.push(bytes.subarray(start, i));
      start = i + 2;
    }
  }

  out.push(bytes.subarray(start));
  return out;
};
