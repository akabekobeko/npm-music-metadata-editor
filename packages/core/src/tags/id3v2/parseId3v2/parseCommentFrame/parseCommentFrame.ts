import { Buffer } from "node:buffer";
import { decodeText } from "../../../../utils/encoding/decodeText.js";
import type { TextEncoding } from "../../../../utils/encoding/types.js";
import { splitOnTerminator } from "./splitOnTerminator.js";
import type { CommentFrame } from "./types.js";

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
