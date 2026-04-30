import { Buffer } from "node:buffer";
import { encodeText } from "../../../../utils/encoding/encodeText.js";
import type { TextEncoding } from "../../../../utils/encoding/types.js";
import { padLanguage } from "./padLanguage.js";

/** Arguments for {@link buildCommentFrameBody}. */
type Args = {
  /** ISO-639 language code (3 lower-case letters; padded / truncated to 3). */
  language: string;
  /** Short content descriptor; usually empty. */
  description: string;
  /** Comment text. */
  text: string;
  /** Text encoding to use. */
  encoding: TextEncoding;
};

const ENCODING_TO_BYTE: Readonly<Record<string, number>> = {
  latin1: 0x00,
  utf16: 0x01,
  utf16le: 0x01,
  utf16be: 0x02,
  utf8: 0x03,
};

/**
 * Build the body of a `COMM` (comment) or `USLT` (lyrics) frame.
 *
 * Layout: `<encoding:1><language:3><description><term><text>` where `term` is
 * `0x00` for single-byte encodings or `0x00 0x00` for UTF-16 family.
 *
 * @returns The encoded body ready to wrap in a frame header.
 */
export const buildCommentFrameBody = ({
  language,
  description,
  text,
  encoding,
}: Args): Uint8Array => {
  const encByte = ENCODING_TO_BYTE[encoding];
  if (encByte === undefined) {
    throw new Error(`buildCommentFrameBody: unsupported encoding "${encoding}"`);
  }

  const lang = padLanguage(language);
  const descriptionBytes = encodeText(description, encoding);
  const textBytes = encodeText(text, encoding);
  const isUtf16 = encoding === "utf16" || encoding === "utf16be" || encoding === "utf16le";
  const terminator = isUtf16 ? new Uint8Array([0x00, 0x00]) : new Uint8Array([0x00]);

  const concatenated = Buffer.concat([
    Uint8Array.of(encByte),
    lang,
    descriptionBytes,
    terminator,
    textBytes,
  ]);
  return new Uint8Array(concatenated.buffer, concatenated.byteOffset, concatenated.byteLength);
};
