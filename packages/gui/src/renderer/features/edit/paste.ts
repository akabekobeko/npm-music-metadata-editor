import type { TagData } from "../../../main/ipc/types.js";
import { isCellWritable } from "../spreadsheet/isCellWritable.js";
import type { ColumnId, FormatSupportMap } from "../spreadsheet/types.js";
import type { TrackRow } from "../tracks/types.js";
import { setTagValue } from "./setTagValue.js";
import { validateTagValue } from "./validators.js";

/** Counts and rows produced by {@link applyPaste}. */
export type PasteOutcome = {
  /** Cells that received the pasted value. */
  readonly applied: number;
  /** Cells skipped because the target format cannot persist the field. */
  readonly skippedUnsupported: number;
  /** Cells skipped because the value failed validation. */
  readonly skippedInvalid: number;
  /** Replacement row array, with the paste applied. */
  readonly nextRows: readonly TrackRow[];
};

type Args = {
  /** Open spreadsheet rows, in display order. */
  readonly rows: readonly TrackRow[];
  /** Target column for every value (column-paste, not 2-D paste). */
  readonly columnId: ColumnId;
  /** Clipboard lines pre-parsed by {@link parseClipboardText}. */
  readonly values: readonly string[];
  /** Format support matrix from `mme:formatSupport:list`. */
  readonly support: FormatSupportMap;
};

/**
 * Split clipboard text into one value per row.
 *
 * Newlines from any platform (`\r\n` / `\r` / `\n`) split records; one trailing
 * newline is dropped so `Cmd+C` from Excel-style sources doesn't yield a
 * phantom empty row. Tab-separated payloads keep only the first column — pasting
 * a 2-column copy into a single target column would otherwise silently drop the
 * tail.
 *
 * @param raw - Raw text returned by `navigator.clipboard.readText()`.
 * @returns One string per record. Empty input yields an empty array.
 */
export const parseClipboardText = (raw: string): readonly string[] => {
  if (raw === "") {
    return [];
  }

  const normalized = raw.replace(/\r\n?/g, "\n");
  const stripped = normalized.endsWith("\n") ? normalized.slice(0, -1) : normalized;
  return stripped.split("\n").map((line) => {
    const tab = line.indexOf("\t");
    return tab === -1 ? line : line.slice(0, tab);
  });
};

/**
 * Apply pre-parsed clipboard values down a column.
 *
 * Excess clipboard lines are discarded; a shorter clipboard leaves the trailing
 * rows untouched (no Excel-style fill). Unsupported / invalid cells are skipped
 * silently — the counters in {@link PasteOutcome} drive the status-bar
 * summary at the call site.
 *
 * @returns Counters plus the next row array. The input rows are not mutated.
 */
export const applyPaste = ({ rows, columnId, values, support }: Args): PasteOutcome => {
  const field = tagFieldOf(columnId);
  let applied = 0;
  let skippedUnsupported = 0;
  let skippedInvalid = 0;

  const nextRows = rows.map((row, index) => {
    const raw = values[index];
    if (raw === undefined) {
      return row;
    }

    if (field === undefined || !isCellWritable({ row, columnId, support })) {
      skippedUnsupported++;
      return row;
    }

    const result = validateTagValue(field, raw);
    if (!result.ok) {
      skippedInvalid++;
      return row;
    }

    applied++;
    return setTagValue({ row, field, value: result.value });
  });

  return { applied, skippedUnsupported, skippedInvalid, nextRows };
};

/**
 * Project a {@link ColumnId} to its `TagData` field, when the column maps to
 * one.
 *
 * @param columnId - Column identifier from the registry.
 * @returns The `keyof TagData` for `tag.*` columns; `undefined` otherwise.
 */
const tagFieldOf = (columnId: ColumnId): keyof TagData | undefined =>
  columnId.startsWith("tag.") ? (columnId.slice("tag.".length) as keyof TagData) : undefined;
