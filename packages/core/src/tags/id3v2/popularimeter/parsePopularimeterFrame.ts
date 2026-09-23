import { decodeText } from "../../../utils/encoding/decodeText.js";
import type { Popularimeter } from "./types.js";

/**
 * Parse the body of a `POPM` frame.
 *
 * The e-mail is always Latin-1 (the frame carries no encoding byte). Bodies
 * without a terminator or without a rating byte after it are rejected.
 *
 * @param body - Raw frame body.
 * @returns The decoded frame, or `undefined` when the body is malformed.
 */
export const parsePopularimeterFrame = (body: Uint8Array): Popularimeter | undefined => {
  const terminator = body.indexOf(0x00);
  if (terminator === -1 || terminator + 1 >= body.length) {
    return undefined;
  }

  return {
    email: decodeText(body.subarray(0, terminator), "latin1"),
    rating: body[terminator + 1] as number,
    counter: body.subarray(terminator + 2),
  };
};
