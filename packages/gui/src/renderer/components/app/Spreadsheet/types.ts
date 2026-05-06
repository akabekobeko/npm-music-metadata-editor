import type { PasteSelectionMode } from "@/features/edit/expandColumnPaste";
import type { ColumnId } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import type { TagData } from "../../../../main/ipc/types";

/** Arguments passed to the spreadsheet's commit callback. */
export type CommitArgs = {
  /** Row whose cell was edited. */
  readonly row: TrackRow;
  /** Tag field that was changed (e.g., `"title"`, `"artist"`). */
  readonly field: keyof TagData;
  /** New value, or `undefined` to clear the field. */
  readonly value: string | number | undefined;
};

/** Arguments passed to the spreadsheet's paste callback. */
export type PasteArgs = {
  /** Column receiving the paste. */
  readonly columnId: ColumnId;
  /** Raw clipboard text — newline-delimited per row, optional TSV per column. */
  readonly clipboardText: string;
  /** Row index where the paste begins. */
  readonly baseRowIndex: number;
  /** Maximum number of rows the paste may cover; clamps the clipboard length. */
  readonly maxRows: number;
  /**
   * Selection that triggered the paste. The host uses this to enable the
   * Numbers-style "broadcast a single value across the column" behaviour for
   * `column` selections (see `expandColumnPaste`).
   */
  readonly mode: PasteSelectionMode;
};

/** What the user has highlighted on the grid. */
export type Selection =
  /** Nothing is selected — keyboard shortcuts that need a target are no-ops. */
  | { readonly kind: "none" }
  /** A single cell at `(rowIndex, columnId)` is selected. */
  | { readonly kind: "cell"; readonly rowIndex: number; readonly columnId: ColumnId }
  /** A whole column is selected — drives column-wide paste. */
  | { readonly kind: "column"; readonly columnId: ColumnId };

/** Active editor state — `null` when no cell is being edited. */
export type EditingState = {
  /** Row currently being edited. */
  readonly rowIndex: number;
  /** Column currently being edited. */
  readonly columnId: ColumnId;
  /** Initial editor content — typically the cell's existing value or the typed character. */
  readonly initialValue: string;
};

/** Argument shape for the `startEditAt` action. */
export type StartEditTarget = {
  /** Row to promote into edit mode. */
  readonly rowIndex: number;
  /** Column to promote into edit mode. */
  readonly columnId: ColumnId;
  /** Initial editor content — typically the cell's existing value or the typed character. */
  readonly seed: string;
};
