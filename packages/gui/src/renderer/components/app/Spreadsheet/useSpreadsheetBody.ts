import { useCallback } from "react";

import { isCellWritable } from "@/features/spreadsheet/isCellWritable";
import type { ColumnDefinition, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import type { EditingState, Selection } from "./types.js";

/** Args for {@link useSpreadsheetBody}. */
type Args = {
  /** Current selection — feeds the highlight predicate. */
  readonly selection: Selection;
  /** Active editor state, or `null` when no cell is being edited. */
  readonly editing: EditingState | null;
  /** Format support matrix used by the writability predicate. */
  readonly support: FormatSupportMap;
};

/** Per-cell derived flags consumed by the body renderer. */
export type CellState = {
  /** Whether the cell accepts edits in the current format. */
  readonly cellWritable: boolean;
  /** Whether the cell is part of the current selection. */
  readonly isSelected: boolean;
  /** Whether the cell is the active inline editor target. */
  readonly isEditingCell: boolean;
};

/** Argument shape for the resolver returned by {@link useSpreadsheetBody}. */
type CellStateInput = {
  /** Row's grid index. */
  readonly rowIndex: number;
  /** Column being rendered. */
  readonly column: ColumnDefinition;
  /** Row being rendered. */
  readonly row: TrackRow;
};

/**
 * Build the per-cell predicate the body uses to style and gate each `<td>`.
 *
 * Encapsulates the three flags every cell needs (writability, selection
 * membership, edit-mode target) so the body renderer stays declarative.
 *
 * @param args - Selection / editing state and the format support matrix.
 * @returns Resolver that yields the {@link CellState} for a given cell.
 */
export const useSpreadsheetBody = ({
  selection,
  editing,
  support,
}: Args): ((input: CellStateInput) => CellState) =>
  useCallback(
    ({ rowIndex, column, row }: CellStateInput): CellState => {
      const cellWritable = isCellWritable({ row, columnId: column.id, support });
      const isSelected =
        (selection.kind === "cell" &&
          selection.rowIndex === rowIndex &&
          selection.columnId === column.id) ||
        (selection.kind === "column" && selection.columnId === column.id);
      const isEditingCell =
        editing !== null && editing.rowIndex === rowIndex && editing.columnId === column.id;
      return { cellWritable, isSelected, isEditingCell };
    },
    [selection, editing, support],
  );
