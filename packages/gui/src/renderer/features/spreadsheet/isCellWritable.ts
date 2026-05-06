import type { TagData } from "@mme/ipc";
import type { TrackRow } from "../tracks/types.js";
import type { ColumnId, FormatSupportMap } from "./types.js";

/** Column ids that are never editable, regardless of the row's format. */
const NEVER_EDITABLE_COLUMNS = new Set<ColumnId>([
  "fileName",
  "audioFormat",
  "durationMs",
  "warnings",
  "chapters",
]);

type Args = {
  /** Track row identifying the audio format. */
  readonly row: TrackRow;
  /** Column whose cell is being inspected. */
  readonly columnId: ColumnId;
  /** Format support matrix from `mme:formatSupport:list`. */
  readonly support: FormatSupportMap;
};

/**
 * Decide whether a cell should accept edits.
 *
 * Combines two checks:
 * 1. Is this column even editable in principle? (`fileName` / `durationMs` etc.
 *    are always read-only.)
 * 2. Does the row's audio format declare support for the underlying field /
 *    payload? (e.g. WAV's `mme:formatSupport:list` entry omits `pictures`.)
 *
 * Any cell that fails either check is rendered with the `DisabledCell` style
 * and ignores paste events — even when the underlying value is non-empty
 * (display still happens; mutation does not).
 *
 * @returns `true` when the cell accepts edits.
 */
export const isCellWritable = ({ row, columnId, support }: Args): boolean => {
  if (NEVER_EDITABLE_COLUMNS.has(columnId)) {
    return false;
  }

  const entry = support.get(row.track.audioFormat);
  if (!entry) {
    return false;
  }

  if (columnId === "pictures") {
    return entry.supportsPictures;
  }

  if (columnId === "lyrics") {
    return entry.supportsLyrics;
  }

  // Tag column: id has the form `tag.<field>`.
  const field = columnId.slice("tag.".length) as keyof TagData;
  return entry.writableTagFields.includes(field);
};
