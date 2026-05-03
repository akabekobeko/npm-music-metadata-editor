import type { TagData } from "../../../types.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";
import type { Id3v2Frame } from "../types.js";
import { buildTextFrame } from "./buildTextFrame.js";

/** Arguments for {@link appendSlashPair}. */
type Args = {
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
export const appendSlashPair = ({
  frames,
  tag,
  numberField,
  totalField,
  frameId,
  encoding,
}: Args): void => {
  const number = tag[numberField];
  if (number === undefined) {
    return;
  }

  const total = tag[totalField];
  const text = total === undefined ? `${number}` : `${number}/${total}`;
  frames.push(buildTextFrame({ id: frameId, text, encoding }));
};
