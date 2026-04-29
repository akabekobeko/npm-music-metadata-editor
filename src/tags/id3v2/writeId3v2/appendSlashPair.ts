import type { TagData } from "../../../types.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";
import type { Id3v2Frame } from "../types.js";
import { buildTextFrame } from "./buildTextFrame.js";

/** Arguments for {@link appendSlashPair}. */
export type AppendSlashPairArgs = {
  /** Frame list mutated in place. */
  frames: Id3v2Frame[];
  /** Source `TagData` to read from. */
  tag: Partial<TagData>;
  /** Field holding the leading number (track / disc). */
  numberField: "trackNumber" | "discNumber";
  /** Field holding the optional total (trackTotal / discTotal). */
  totalField: "trackTotal" | "discTotal";
  /** Frame ID to emit (`TRCK` / `TPOS`). */
  frameId: string;
  /** Text encoding used inside the frame body. */
  encoding: TextEncoding;
};

/** Emit a `TRCK` / `TPOS`-style `"X/Y"` (or `"X"` when no total) frame. */
export const appendSlashPair = (args: AppendSlashPairArgs): void => {
  const number = args.tag[args.numberField];
  if (number === undefined) {
    return;
  }

  const total = args.tag[args.totalField];
  const text = total === undefined ? `${number}` : `${number}/${total}`;
  args.frames.push(buildTextFrame({ id: args.frameId, text, encoding: args.encoding }));
};
