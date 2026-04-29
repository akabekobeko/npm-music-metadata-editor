import { Buffer } from "node:buffer";
import { encodeText } from "../../../utils/encoding/encodeText.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";

type BuildTextFrameBodyArgs = {
  /** Text payload to encode. */
  text: string;
  /** Text encoding to use (`"latin1"`, `"utf8"`, `"utf16"`, `"utf16be"`). */
  encoding: TextEncoding;
};

/** Map an encoding name back to the ID3v2 encoding selector byte. */
const ENCODING_TO_BYTE: Readonly<Record<string, number>> = {
  latin1: 0x00,
  utf16: 0x01,
  utf16le: 0x01,
  utf16be: 0x02,
  utf8: 0x03,
};

/**
 * Build the body of a text-information frame (`T*`).
 *
 * The body is `<encoding-byte:1><text-bytes...>`. No null terminator is
 * appended (single-value frames in v2.3/v2.4 do not require one — most readers,
 * including ours, accept either form).
 *
 * @returns The encoded body ready to wrap in a frame header.
 */
export const buildTextFrameBody = (args: BuildTextFrameBodyArgs): Uint8Array => {
  const encByte = ENCODING_TO_BYTE[args.encoding];
  if (encByte === undefined) {
    throw new Error(`buildTextFrameBody: unsupported encoding "${args.encoding}"`);
  }

  const text = encodeText(args.text, args.encoding);
  const out = Buffer.alloc(1 + text.length);
  out[0] = encByte;
  out.set(text, 1);
  return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
};
