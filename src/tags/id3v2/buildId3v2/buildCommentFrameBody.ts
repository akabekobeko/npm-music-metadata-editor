import { Buffer } from "node:buffer";
import { encodeText, type TextEncoding } from "../../../utils/encoding.js";

type BuildCommentFrameBodyArgs = {
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
 */
export const buildCommentFrameBody = (args: BuildCommentFrameBodyArgs): Uint8Array => {
  const encByte = ENCODING_TO_BYTE[args.encoding];
  if (encByte === undefined) {
    throw new Error(`buildCommentFrameBody: unsupported encoding "${args.encoding}"`);
  }

  const lang = padLanguage(args.language);
  const description = encodeText(args.description, args.encoding);
  const text = encodeText(args.text, args.encoding);
  const isUtf16 =
    args.encoding === "utf16" || args.encoding === "utf16be" || args.encoding === "utf16le";
  const terminator = isUtf16 ? new Uint8Array([0x00, 0x00]) : new Uint8Array([0x00]);

  const out = Buffer.alloc(1 + 3 + description.length + terminator.length + text.length);
  let pos = 0;
  out[pos] = encByte;
  pos += 1;
  out.set(lang, pos);
  pos += 3;
  out.set(description, pos);
  pos += description.length;
  out.set(terminator, pos);
  pos += terminator.length;
  out.set(text, pos);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};

/** Lower-case the language code, then truncate or right-pad with spaces to 3 bytes. */
const padLanguage = (lang: string): Uint8Array => {
  const lowered = lang.toLowerCase();
  const truncated = `${lowered}   `.slice(0, 3);
  return new Uint8Array(Buffer.from(truncated, "latin1"));
};
