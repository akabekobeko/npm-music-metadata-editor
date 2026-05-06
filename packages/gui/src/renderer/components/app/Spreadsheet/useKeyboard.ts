import { useEffect } from "react";

import type { ColumnDefinition, ColumnId } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import { readCellAsString } from "./readCellAsString.js";
import type { EditingState, PasteArgs, Selection, StartEditTarget } from "./types.js";

/** Args for {@link useKeyboard}. */
type Args = {
  /** Active editor state; the listener no-ops while an editor has focus. */
  readonly editing: EditingState | null;
  /** Current selection used to dispatch shortcuts (paste, type-to-edit). */
  readonly selection: Selection;
  /** Track rows backing the grid; selections index into this array. */
  readonly rows: readonly TrackRow[];
  /** Look up a column definition by id (sourced from `useSelection`). */
  readonly findColumn: (id: ColumnId) => ColumnDefinition | undefined;
  /** Open the inline editor for the given target. */
  readonly startEditAt: (target: StartEditTarget) => void;
  /** Forward a clipboard paste request to the host. */
  readonly onPaste: (args: PasteArgs) => void;
  /** Forward an undo request to the host. Bound to Cmd/Ctrl+Z. */
  readonly onUndo: () => void;
};

/**
 * Wire global keyboard shortcuts to the grid's selection.
 *
 * Listens at `document` so the shortcuts work regardless of which cell has
 * focus, but defers to native input / textarea / contentEditable targets so
 * the user can still paste / undo while editing a cell.
 *
 * Handles three kinds of input:
 *   1. `Cmd/Ctrl+Z` — fan out to the host's undo callback.
 *   2. `Cmd/Ctrl+V` — read the clipboard and translate the current selection
 *      into a paste request.
 *   3. Single-character keys / `Enter` while a cell is selected — promote the
 *      selection into an inline editor seeded with the typed character or the
 *      current cell value.
 *
 * @param args - Selection / editing state, row data, the column lookup, the
 *   `startEditAt` action exposed by `useSelection`, and the host's
 *   paste / undo callbacks.
 */
export const useKeyboard = ({
  editing,
  selection,
  rows,
  findColumn,
  startEditAt,
  onPaste,
  onUndo,
}: Args): void => {
  useEffect(() => {
    const handler = (event: globalThis.KeyboardEvent): void => {
      if (editing) {
        return;
      }

      // Defer to inputs / textareas so the user can paste / undo inside them.
      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      const usingMeta = event.metaKey || event.ctrlKey;
      if (usingMeta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        onUndo();
        return;
      }

      if (usingMeta && event.key.toLowerCase() === "v") {
        event.preventDefault();
        dispatchPaste({ selection, rowsLength: rows.length, onPaste });
        return;
      }

      if (selection.kind !== "cell") {
        return;
      }

      const { rowIndex, columnId } = selection;
      const row = rows[rowIndex];
      const column = findColumn(columnId);
      if (!row || !column) {
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        startEditAt({ rowIndex, columnId, seed: readCellAsString(row, column) });
        return;
      }

      if (event.key.length === 1 && !usingMeta && !event.altKey) {
        event.preventDefault();
        startEditAt({ rowIndex, columnId, seed: event.key });
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [editing, selection, rows, findColumn, startEditAt, onPaste, onUndo]);
};

type DispatchPasteArgs = {
  /** Selection that triggered the paste. */
  readonly selection: Selection;
  /** Total number of rows in the grid; caps column-mode pastes. */
  readonly rowsLength: number;
  /** Host callback receiving the resolved paste request. */
  readonly onPaste: (args: PasteArgs) => void;
};

/**
 * Translate the current selection into a paste request to the host.
 *
 * Skips when nothing is selected; for a single cell the host receives `1` as
 * the maximum row count so only the first clipboard line is consumed.
 *
 * @param args - Selection, total row count, and the host callback.
 */
const dispatchPaste = ({ selection, rowsLength, onPaste }: DispatchPasteArgs): void => {
  if (selection.kind === "none") {
    return;
  }

  void navigator.clipboard.readText().then((text) => {
    if (selection.kind === "cell") {
      onPaste({
        columnId: selection.columnId,
        clipboardText: text,
        baseRowIndex: selection.rowIndex,
        maxRows: 1,
        mode: "cell",
      });
      return;
    }

    onPaste({
      columnId: selection.columnId,
      clipboardText: text,
      baseRowIndex: 0,
      maxRows: rowsLength,
      mode: "column",
    });
  });
};
