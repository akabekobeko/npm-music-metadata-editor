import { Buffer } from "node:buffer";
import { decodeText, type TextEncoding } from "../../../utils/encoding.js";

/** Result of parsing a `COMM` (or `USLT`) frame body. */
export type CommentFrame = {
  /** ISO-639 3-character language code, lower-case. */
  language: string;
  /** Short content descriptor, often empty. */
  description: string;
  /** Comment text. */
  text: string;
};

const ENCODING_BY_BYTE: Readonly<Record<number, TextEncoding>> = {
  0: "latin1",
  1: "utf16",
  2: "utf16be",
  3: "utf8",
};

/**
 * Decode the body of a `COMM` (comment) or `USLT` (unsynchronised lyrics) frame.
 *
 * Layout: `<encoding:1><language:3><description:variable><terminator><text>`.
 *
 * @param body - Frame body bytes.
 * @returns The parsed pieces, or `undefined` for malformed bodies.
 */
export const parseCommentFrame = (body: Uint8Array): CommentFrame | undefined => {
  if (body.length < 5) {
    return undefined;
  }

  const encoding = ENCODING_BY_BYTE[body[0] as number];
  if (encoding === undefined) {
    return undefined;
  }

  const language = Buffer.from(body.subarray(1, 4)).toString("latin1").toLowerCase();
  const rest = body.subarray(4);
  const split = splitOnTerminator(rest, encoding);
  if (split === undefined) {
    return undefined;
  }

  const description = decodeText(split.first, encoding);
  const text = decodeText(split.second, encoding);
  return { language, description, text };
};

/**
 * Split the bytes into the description and the text payload at the first
 * encoding-appropriate null terminator.
 */
const splitOnTerminator = (
  bytes: Uint8Array,
  encoding: TextEncoding,
): { first: Uint8Array; second: Uint8Array } | undefined => {
  if (encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le") {
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      if (bytes[i] === 0x00 && bytes[i + 1] === 0x00) {
        return {
          first: bytes.subarray(0, i),
          second: stripLeadingTerminator(bytes.subarray(i + 2), true),
        };
      }
    }

    return { first: bytes, second: new Uint8Array() };
  }

  const idx = bytes.indexOf(0x00);
  if (idx === -1) {
    return { first: bytes, second: new Uint8Array() };
  }

  return {
    first: bytes.subarray(0, idx),
    second: stripLeadingTerminator(bytes.subarray(idx + 1), false),
  };
};

/**
 * Some writers leave an extra terminator before the text payload. Strip a
 * single leading terminator when present so the decoder sees clean bytes.
 */
const stripLeadingTerminator = (bytes: Uint8Array, isUtf16: boolean): Uint8Array => {
  if (isUtf16 && bytes.length >= 2 && bytes[0] === 0x00 && bytes[1] === 0x00) {
    return bytes.subarray(2);
  }

  if (!isUtf16 && bytes.length >= 1 && bytes[0] === 0x00) {
    return bytes.subarray(1);
  }

  return bytes;
};
