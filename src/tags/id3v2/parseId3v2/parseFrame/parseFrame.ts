import { parseV22Frame } from "./parseV22Frame.js";
import { parseV23OrV24Frame } from "./parseV23OrV24Frame.js";
import type { ParseFrameArgs, ParseFrameResult } from "./types.js";

/**
 * Read a single frame starting at `args.offset`.
 *
 * Returns `{ kind: "padding" }` when the next byte is `0x00` (padding marks the
 * end of the frame stream); `{ kind: "error" }` when the frame header is
 * malformed (size overflows the body, unknown layout); or `{ kind: "frame" }`
 * with the parsed frame and the number of bytes consumed.
 */
export const parseFrame = (args: ParseFrameArgs): ParseFrameResult => {
  const { body, offset, majorVersion } = args;
  if (offset >= body.length || body[offset] === 0x00) {
    return { kind: "padding" };
  }

  return majorVersion === 2 ? parseV22Frame(body, offset) : parseV23OrV24Frame(args);
};
