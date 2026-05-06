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
  readonly columns: readonly ColumnDefinition[];
  readonly rows: readonly TrackRow[];
  readonly support: FormatSupportMap;
  readonly onCommit: (args: CommitArgs) => void;
};

/** Public surface returned by {@link useSpreadsheetSelection}. */
export type SpreadsheetSelection = {
  readonly selection: Selection;
  readonly editing: EditingState | null;
  readonly findColumn: (id: ColumnId) => ColumnDefinition | undefined;
  readonly startEditAt: (target: StartEditTarget) => void;
  readonly commitFromEditor: (value: string | number | undefined) => void;
  readonly cancelEditor: () => void;
  readonly handleCellClick: (rowIndex: number, columnId: ColumnId) => void;
  readonly handleCellDoubleClick: (rowIndex: number, columnId: ColumnId) => void;
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
