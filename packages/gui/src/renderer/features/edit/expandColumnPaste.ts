/** Selection mode that produced the clipboard paste request. */
export type PasteSelectionMode = "cell" | "column";

type Args = {
  /** Values produced by `parseClipboardText`. */
  readonly values: readonly string[];
  /** Selection that triggered the paste. */
  readonly mode: PasteSelectionMode;
  /** Number of rows the column selection covers. */
  readonly totalRows: number;
};

/**
 * Expand a 1-value clipboard paste into a fill across every selected row when
 * the user has a column selected.
 *
 * Rationale: Numbers / Excel column-selection paste uses "broadcast a single
 * value" as the canonical batch-rename gesture (e.g. fixing a misspelt artist
 * name across every loaded file). Multi-value clipboards keep the row-by-row
 * mapping defined in `applyPaste` so excess clipboard rows are still discarded
 * and shorter clipboards still preserve the trailing rows.
 *
 * @returns The (possibly expanded) values array. The original is returned
 *   unchanged for cell selections, multi-value column pastes, and edge cases
 *   like an empty clipboard or zero rows.
 */
export const expandColumnPaste = ({ values, mode, totalRows }: Args): readonly string[] => {
  if (mode !== "column") {
    return values;
  }

  if (values.length !== 1 || totalRows <= 0) {
    return values;
  }

  const seed = values[0];
  if (seed === undefined) {
    return values;
  }

  return new Array<string>(totalRows).fill(seed);
};
