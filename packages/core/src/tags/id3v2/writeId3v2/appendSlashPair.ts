import type { TagPatch } from "../../../types.js";
import type { TextEncoding } from "../../../utils/encoding/types.js";
import { hasTagValue } from "../../../utils/tagPatch/hasTagValue.js";
import type { Id3v2Frame } from "../types.js";
import { buildTextFrame } from "./buildTextFrame.js";

/** Arguments for {@link appendSlashPair}. */
type Args = {
  /** Frame list mutated in place. */
  frames: Id3v2Frame[];
  /** Source `TagPatch` to read from. */
  tag: TagPatch;
  /** Field holding the leading number (track / disc). */
  numberField: "trackNumber" | "discNumber";
  /** Field holding the optional total (trackTotal / discTotal). */
  totalField: "trackTotal" | "discTotal";
  /** Frame ID to emit (`TRCK` / `TPOS`). */
  frameId: string;
  /** Text encoding used inside the frame body. */
  encoding: TextEncoding;
};

/**
 * Emit a `TRCK` / `TPOS`-style `"X/Y"` (or `"X"` when no total) frame.
 *
 * Nothing is emitted when the number is `undefined` or cleared (`null`); a
 * cleared total is treated like a missing one.
 */
export const appendSlashPair = ({
  frames,
  tag,
  numberField,
  totalField,
  frameId,
  encoding,
}: Args): void => {
  const number = tag[numberField];
  if (!hasTagValue(number)) {
    return;
  }

  const total = tag[totalField];
  const text = hasTagValue(total) ? `${number}/${total}` : `${number}`;
  frames.push(buildTextFrame({ id: frameId, text, encoding }));
};
