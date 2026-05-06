import type { PasteSelectionMode } from "@/features/edit/expandColumnPaste";
import type { ColumnId } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import type { TagData } from "../../../../main/ipc/types";

/** Arguments passed to the spreadsheet's commit callback. */
export type CommitArgs = {
  readonly row: TrackRow;
  readonly field: keyof TagData;
  readonly value: string | number | undefined;
};

/** Arguments passed to the spreadsheet's paste callback. */
export type PasteArgs = {
  readonly columnId: ColumnId;
  readonly clipboardText: string;
  readonly baseRowIndex: number;
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
  | { readonly kind: "none" }
  | { readonly kind: "cell"; readonly rowIndex: number; readonly columnId: ColumnId }
  | { readonly kind: "column"; readonly columnId: ColumnId };

/** Active editor state — `null` when no cell is being edited. */
export type EditingState = {
  readonly rowIndex: number;
  readonly columnId: ColumnId;
  readonly initialValue: string;
};

/** Argument shape for the `startEditAt` action. */
export type StartEditTarget = {
  readonly rowIndex: number;
  readonly columnId: ColumnId;
  readonly seed: string;
};
