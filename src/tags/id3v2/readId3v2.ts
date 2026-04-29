import type { TagData } from "../../types.js";
import { ID3V2_TEXT_FRAME_MAP } from "./constants.js";
import { parseCommentFrame } from "./parseId3v2/parseCommentFrame.js";
import { parseId3v2 } from "./parseId3v2/parseId3v2.js";
import { parseTextFrame } from "./parseId3v2/parseTextFrame.js";
import type { Id3v2Tag } from "./types.js";

/** Re-exported so callers can read the tag without reaching into the subdirectory. */
export const readId3v2 = parseId3v2;

/** Numeric `TagData` fields. Resolved from text frames via `Number.parseInt`. */
const NUMERIC_TAG_FIELDS: ReadonlySet<keyof TagData> = new Set([
  "year",
  "trackNumber",
  "discNumber",
  "bpm",
]);

/**
 * Project an {@link Id3v2Tag}'s frames onto our high-level {@link TagData} shape.
 *
 * Only frames listed in {@link ID3V2_TEXT_FRAME_MAP} are surfaced; everything
 * else is left in `tag.frames` for round-trip preservation. `TRCK` / `TPOS`
 * "X/Y" strings split into number + total fields.
 *
 * @param tag - Parsed ID3v2 tag.
 * @returns A `TagData` populated with the recognised text/comment fields.
 */
export const id3v2TagToTagData = (tag: Id3v2Tag): TagData => {
  const result: TagData = {};
  for (const frame of tag.frames) {
    if (frame.id === "COMM") {
      const comment = parseCommentFrame(frame.data);
      if (comment !== undefined && comment.text !== "") {
        result.comment = comment.text;
      }

      continue;
    }

    if (frame.id.startsWith("T") && frame.id !== "TXXX") {
      assignTextFrame({ target: result, frameId: frame.id, body: frame.data });
    }
  }

  return result;
};

type AssignTextFrameArgs = {
  /** Mutated tag-data target. */
  target: TagData;
  /** Frame ID being assigned (e.g. `"TIT2"`). */
  frameId: string;
  /** Raw frame body bytes. */
  body: Uint8Array;
};

/** Look up the public field for `frameId` and assign the parsed text to it. */
const assignTextFrame = (args: AssignTextFrameArgs): void => {
  const field = ID3V2_TEXT_FRAME_MAP[args.frameId];
  if (field === undefined) {
    return;
  }

  const text = parseTextFrame(args.body);
  if (text === undefined || text === "") {
    return;
  }

  if (field === "trackNumber" || field === "discNumber") {
    assignSlashPair({ target: args.target, field, text });
    return;
  }

  if (NUMERIC_TAG_FIELDS.has(field as keyof TagData)) {
    const parsed = Number.parseInt(text, 10);
    if (Number.isFinite(parsed)) {
      (args.target as Record<string, unknown>)[field] = parsed;
    }

    return;
  }

  (args.target as Record<string, unknown>)[field] = text;
};

type AssignSlashPairArgs = {
  /** Mutated tag-data target. */
  target: TagData;
  /** Field receiving the leading number. */
  field: "trackNumber" | "discNumber";
  /** Source text (e.g. `"3"` or `"3/12"`). */
  text: string;
};

/**
 * Handle the `"3"` / `"3/12"` shorthand used by `TRCK` and `TPOS`.
 *
 * Splits on `/` and writes the leading number into `trackNumber` / `discNumber`,
 * the trailing number (when present) into `trackTotal` / `discTotal`.
 */
const assignSlashPair = (args: AssignSlashPairArgs): void => {
  const [head, tail] = args.text.split("/", 2);
  const headNum = Number.parseInt(head ?? "", 10);
  if (Number.isFinite(headNum)) {
    args.target[args.field] = headNum;
  }

  if (tail !== undefined) {
    const tailNum = Number.parseInt(tail, 10);
    if (Number.isFinite(tailNum)) {
      const totalField = args.field === "trackNumber" ? "trackTotal" : "discTotal";
      args.target[totalField] = tailNum;
    }
  }
};
