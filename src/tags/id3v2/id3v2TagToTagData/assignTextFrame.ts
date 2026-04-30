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
type Args = {
  /** Mutated tag-data target. */
  target: TagData;
  /** Frame ID being assigned (e.g. `"TIT2"`). */
  frameId: string;
  /** Raw frame body bytes. */
  body: Uint8Array;
};

/** Look up the public field for `frameId` and assign the parsed text to it. */
export const assignTextFrame = ({ target, frameId, body }: Args): void => {
  const field = ID3V2_TEXT_FRAME_MAP[frameId];
  if (field === undefined) {
    return;
  }

  const text = parseTextFrame(body);
  if (text === undefined || text === "") {
    return;
  }

  if (field === "trackNumber" || field === "discNumber") {
    assignSlashPair({ target, field, text });
    return;
  }

  if (NUMERIC_TAG_FIELDS.has(field as keyof TagData)) {
    const parsed = Number.parseInt(text, 10);
    if (Number.isFinite(parsed)) {
      (target as Record<string, unknown>)[field] = parsed;
    }

    return;
  }

  (target as Record<string, unknown>)[field] = text;
};
