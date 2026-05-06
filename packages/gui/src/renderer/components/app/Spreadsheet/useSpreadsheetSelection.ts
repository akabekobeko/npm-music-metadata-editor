import { useCallback, useState } from "react";

import { isCellWritable } from "@/features/spreadsheet/isCellWritable";
import { isColumnSelectable } from "@/features/spreadsheet/isColumnSelectable";
import type { ColumnDefinition, ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import type { TagData } from "../../../../main/ipc/types";
import { readCellAsString } from "./readCellAsString.js";
import type { CommitArgs, EditingState, Selection, StartEditTarget } from "./types.js";

/** Args for {@link useSpreadsheetSelection}. */
type Args = {
  /** Visible columns; supplies `findColumn` and gates per-column edit policy. */
  readonly columns: readonly ColumnDefinition[];
  /** Track rows backing the grid; selections / edits index into this array. */
  readonly rows: readonly TrackRow[];
  /** Format support matrix used to gate writable cells. */
  readonly support: FormatSupportMap;
  /** Forward a successful inline-editor commit to the host's edit store. */
  readonly onCommit: (args: CommitArgs) => void;
};

/** Public surface returned by {@link useSpreadsheetSelection}. */
export type SpreadsheetSelection = {
  /** Current selection — feeds visual highlight and keyboard dispatch. */
  readonly selection: Selection;
  /** Active editor state, or `null` when no cell is being edited. */
  readonly editing: EditingState | null;
  /** Look up a column definition by id. Memoised against `columns`. */
  readonly findColumn: (id: ColumnId) => ColumnDefinition | undefined;
  /** Promote a cell into edit mode with an explicit seed value. */
  readonly startEditAt: (target: StartEditTarget) => void;
  /** Commit the value held by the editor and clear the editor state. */
  readonly commitFromEditor: (value: string | number | undefined) => void;
  /** Discard the editor without committing. */
  readonly cancelEditor: () => void;
  /** Single-click handler — selects the cell and exits edit mode. */
  readonly handleCellClick: (rowIndex: number, columnId: ColumnId) => void;
  /** Double-click handler — selects the cell and opens the inline editor. */
  readonly handleCellDoubleClick: (rowIndex: number, columnId: ColumnId) => void;
  /** Header click handler — selects the column when it permits column-wide ops. */
  readonly handleColumnHeaderClick: (columnId: ColumnId) => void;
};

/**
 * Manage the spreadsheet's selection and inline-editor state.
 *
 * Selection lives in component-local state because it is purely a UI concern;
 * mutations propagate upward through `onCommit` so the edit store stays the
 * single source of truth for rows. `findColumn` and `startEditAt` are
 * exposed because the keyboard layer (see `useSpreadsheetKeyboard`) needs to
 * promote a selected cell into edit mode without going through the click
 * handlers.
 *
 * @param args - Columns, rows, format support matrix, and the commit sink.
 * @returns Selection / editing state plus pointer-driven interaction handlers
 *   and an explicit `startEditAt` for keyboard-driven edits.
 */
export const useSpreadsheetSelection = ({
  columns,
  rows,
  support,
  onCommit,
}: Args): SpreadsheetSelection => {
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [editing, setEditing] = useState<EditingState | null>(null);

  const findColumn = useCallback(
    (id: ColumnId): ColumnDefinition | undefined => columns.find((column) => column.id === id),
    [columns],
  );

  const startEditAt = useCallback(
    (target: StartEditTarget): void => {
      const { rowIndex, columnId, seed } = target;
      const row = rows[rowIndex];
      const column = findColumn(columnId);
      if (!row || !column || column.editable !== "tag") {
        return;
      }

      if (!isCellWritable({ row, columnId, support })) {
        return;
      }

      setEditing({ rowIndex, columnId, initialValue: seed });
    },
    [rows, findColumn, support],
  );

  const commitFromEditor = useCallback(
    (value: string | number | undefined): void => {
      if (!editing) {
        return;
      }

      const row = rows[editing.rowIndex];
      const column = findColumn(editing.columnId);
      if (!row || !column || column.editable !== "tag") {
        setEditing(null);
        return;
      }

      const field = column.id.slice("tag.".length) as keyof TagData;
      onCommit({ row, field, value });
      setEditing(null);
    },
    [editing, rows, findColumn, onCommit],
  );

  const cancelEditor = useCallback((): void => {
    setEditing(null);
  }, []);

  const handleCellClick = useCallback((rowIndex: number, columnId: ColumnId): void => {
    setSelection({ kind: "cell", rowIndex, columnId });
    setEditing(null);
  }, []);

  const handleCellDoubleClick = useCallback(
    (rowIndex: number, columnId: ColumnId): void => {
      const row = rows[rowIndex];
      const initial = row ? readCellAsString(row, findColumn(columnId)) : "";
      startEditAt({ rowIndex, columnId, seed: initial });
    },
    [rows, findColumn, startEditAt],
  );

  const handleColumnHeaderClick = useCallback(
    (columnId: ColumnId): void => {
      const column = findColumn(columnId);
      if (!column || !isColumnSelectable(column)) {
        return;
      }

      setSelection({ kind: "column", columnId });
      setEditing(null);
    },
    [findColumn],
  );

  return {
    selection,
    editing,
    findColumn,
    startEditAt,
    commitFromEditor,
    cancelEditor,
    handleCellClick,
    handleCellDoubleClick,
    handleColumnHeaderClick,
  };
};
