import type { TagData } from "../../../types.js";
import { buildId3v2 } from "../buildId3v2/buildId3v2.js";
import type { Id3v2Frame } from "../types.js";
import { synthesizeFrames } from "./synthesizeFrames.js";

/** Arguments for {@link writeId3v2}. */
export type WriteId3v2Args = {
  /** Source `TagData` whose fields are folded into frames. */
  tag: Partial<TagData>;
  /** Major version to emit (`3` or `4`). */
  majorVersion: 3 | 4;
  /**
   * Pre-existing frames to retain (e.g. unknown frames preserved from a previous
   * read). They are emitted *after* the frames synthesized from `tag`.
   */
  preserveFrames?: readonly Id3v2Frame[];
  /** Optional padding (in bytes) to append after the last frame. */
  padding?: number;
};

/**
 * Build an ID3v2 tag from a {@link TagData} value plus optional preserved frames.
 *
 * - Recognised text fields are emitted as `T*` frames with UTF-8 encoding for
 *   v2.4 and Latin-1 for v2.3.
 * - `comment` becomes a `COMM` frame with empty description and language `"eng"`.
 * - `trackNumber` / `trackTotal` collapse into a single `TRCK` value (`"X/Y"`),
 *   `discNumber` / `discTotal` collapse into `TPOS` similarly.
 * - `preserveFrames` are emitted verbatim (used for unknown frames captured on read).
 */
export const writeId3v2 = (args: WriteId3v2Args): Uint8Array => {
  const frames = synthesizeFrames(args.tag, args.majorVersion);
  const all = args.preserveFrames === undefined ? frames : [...frames, ...args.preserveFrames];
  return buildId3v2({ majorVersion: args.majorVersion, frames: all, padding: args.padding });
};
