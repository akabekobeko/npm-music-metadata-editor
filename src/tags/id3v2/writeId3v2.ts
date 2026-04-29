import type { TagData } from "../../types.js";
import type { TextEncoding } from "../../utils/encoding.js";
import { buildCommentFrameBody } from "./buildId3v2/buildCommentFrameBody.js";
import { buildId3v2 } from "./buildId3v2/buildId3v2.js";
import { buildTextFrameBody } from "./buildId3v2/buildTextFrameBody.js";
import { ID3V2_TEXT_FRAME_MAP } from "./constants.js";
import type { Id3v2Frame, Id3v2FrameFlags } from "./types.js";

const NO_FLAGS: Id3v2FrameFlags = {
  tagAlterPreservation: false,
  fileAlterPreservation: false,
  readOnly: false,
  groupingIdentity: false,
  compression: false,
  encryption: false,
  unsynchronization: false,
  dataLengthIndicator: false,
};

/** Reverse `ID3V2_TEXT_FRAME_MAP`: `TagData` field → frame ID. */
const TAG_FIELD_TO_FRAME_ID: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(ID3V2_TEXT_FRAME_MAP).map(([frameId, field]) => [field, frameId]),
);

type WriteId3v2Args = {
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
 * - Recognised text fields (per {@link TAG_FIELD_TO_FRAME_ID}) are emitted as
 *   `T*` frames with UTF-8 encoding for v2.4 and Latin-1 for v2.3.
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

/** Convert a {@link TagData} value into the ordered list of frames to emit. */
const synthesizeFrames = (tag: Partial<TagData>, majorVersion: 3 | 4): Id3v2Frame[] => {
  const encoding: TextEncoding = majorVersion === 4 ? "utf8" : "latin1";
  const frames: Id3v2Frame[] = [];

  const textFields: (keyof TagData)[] = [
    "title",
    "artist",
    "albumArtist",
    "album",
    "composer",
    "conductor",
    "lyricist",
    "publisher",
    "copyright",
    "genre",
    "group",
    "description",
    "language",
    "isrc",
    "year",
    "recordingDate",
    "originalReleaseDate",
    "publishingDate",
    "bpm",
  ];
  for (const field of textFields) {
    const value = tag[field];
    if (value === undefined || value === "") {
      continue;
    }

    const frameId = TAG_FIELD_TO_FRAME_ID[field];
    if (frameId === undefined) {
      continue;
    }

    frames.push(buildTextFrame({ id: frameId, text: String(value), encoding }));
  }

  appendSlashPair({
    frames,
    tag,
    numberField: "trackNumber",
    totalField: "trackTotal",
    frameId: "TRCK",
    encoding,
  });
  appendSlashPair({
    frames,
    tag,
    numberField: "discNumber",
    totalField: "discTotal",
    frameId: "TPOS",
    encoding,
  });

  if (tag.comment !== undefined && tag.comment !== "") {
    frames.push({
      id: "COMM",
      flags: NO_FLAGS,
      data: buildCommentFrameBody({
        encoding,
        language: "eng",
        description: "",
        text: tag.comment,
      }),
    });
  }

  return frames;
};

type BuildTextFrameArgs = {
  id: string;
  text: string;
  encoding: TextEncoding;
};

/** Wrap `buildTextFrameBody` into a fully-formed {@link Id3v2Frame}. */
const buildTextFrame = (args: BuildTextFrameArgs): Id3v2Frame => ({
  id: args.id,
  flags: NO_FLAGS,
  data: buildTextFrameBody({ text: args.text, encoding: args.encoding }),
});

type AppendSlashPairArgs = {
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
const appendSlashPair = (args: AppendSlashPairArgs): void => {
  const number = args.tag[args.numberField];
  if (number === undefined) {
    return;
  }

  const total = args.tag[args.totalField];
  const text = total === undefined ? `${number}` : `${number}/${total}`;
  args.frames.push(buildTextFrame({ id: args.frameId, text, encoding: args.encoding }));
};
