import type { TextEncoding } from "../../../utils/encoding/types.js";
import { buildTextFrameBody } from "../buildId3v2/buildTextFrameBody.js";
import type { Id3v2Frame } from "../types.js";
import { NO_FRAME_FLAGS } from "./constants.js";

/** Arguments for {@link buildTextFrame}. */
export type BuildTextFrameArgs = {
  /** Frame ID (4 ASCII chars for v2.3 / v2.4). */
  id: string;
  /** Text payload to encode. */
  text: string;
  /** Text encoding. */
  encoding: TextEncoding;
};

/** Wrap {@link buildTextFrameBody} into a fully-formed {@link Id3v2Frame}. */
export const buildTextFrame = (args: BuildTextFrameArgs): Id3v2Frame => ({
  id: args.id,
  flags: NO_FRAME_FLAGS,
  data: buildTextFrameBody({ text: args.text, encoding: args.encoding }),
});
