import type { TagData } from "../../../types.js";
import { ID3V2_TEXT_FRAME_MAP } from "../constants.js";
import { parseTextFrame } from "../parseId3v2/parseTextFrame/parseTextFrame.js";
import { assignSlashPair } from "./assignSlashPair.js";

/** Numeric `TagData` fields. Resolved from text frames via `Number.parseInt`. */
const NUMERIC_TAG_FIELDS: ReadonlySet<keyof TagData> = new Set([
  "year",
  "trackNumber",
  "discNumber",
  "bpm",
]);

/** Arguments for {@link assignTextFrame}. */
export type AssignTextFrameArgs = {
  /** Mutated tag-data target. */
  target: TagData;
  /** Frame ID being assigned (e.g. `"TIT2"`). */
  frameId: string;
  /** Raw frame body bytes. */
  body: Uint8Array;
};

/** Look up the public field for `frameId` and assign the parsed text to it. */
export const assignTextFrame = (args: AssignTextFrameArgs): void => {
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
