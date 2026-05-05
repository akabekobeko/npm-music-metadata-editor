import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PasteSelectionMode } from "@/features/edit/expandColumnPaste";
import { isCellWritable } from "@/features/spreadsheet/isCellWritable";
import type { ColumnDefinition, ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";
import type { TagData } from "../../../../main/ipc/types";

import { EditableCell } from "./cells/EditableCell";
import { renderCell } from "./renderCell";
import { renderHeader } from "./renderHeader";

/** What the user has highlighted on the grid. */
type Selection =
  | { readonly kind: "none" }
  | { readonly kind: "cell"; readonly rowIndex: number; readonly columnId: ColumnId }
  | { readonly kind: "column"; readonly columnId: ColumnId };

/** Active editor state — `null` when no cell is being edited. */
type EditingState = {
  readonly rowIndex: number;
  readonly columnId: ColumnId;
  readonly initialValue: string;
};

/** Arguments passed to {@link SpreadsheetProps.onCommit}. */
export type CommitArgs = {
  readonly row: TrackRow;
  readonly field: keyof TagData;
  readonly value: string | number | undefined;
};

/** Arguments passed to {@link SpreadsheetProps.onPaste}. */
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

/** Props for {@link Spreadsheet}. */
export type SpreadsheetProps = {
  readonly columns: readonly ColumnDefinition[];
  readonly rows: readonly TrackRow[];
  readonly support: FormatSupportMap;
  readonly onOpenPictures: (row: TrackRow) => void;
  readonly onOpenLyrics: (row: TrackRow) => void;
  readonly onCommit: (args: CommitArgs) => void;
  readonly onPaste: (args: PasteArgs) => void;
  readonly onUndo: () => void;
};

/** Estimated row height (px) used by the virtualizer to size the spacer. */
const ROW_HEIGHT = 32;
/** How many rows past the viewport to keep mounted, smoothing scroll. */
const VIRTUAL_OVERSCAN = 8;

/**
 * Virtualized grid with cell selection, inline editing, undo, and column
 * paste.
 *
 * Selection lives in component-local state because it is purely a UI concern;
 * mutations propagate upward through the `onCommit` / `onPaste` / `onUndo`
 * callbacks so the edit store stays the single source of truth for rows.
 *
 * @returns The rendered grid.
 */
export function Spreadsheet({
  columns,
  rows,
  support,
  onOpenPictures,
  onOpenLyrics,
  onCommit,
  onPaste,
  onUndo,
}: SpreadsheetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selection, setSelection] = useState<Selection>({ kind: "none" });
  const [editing, setEditing] = useState<EditingState | null>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
  });

  const findColumn = useCallback(
    (id: ColumnId): ColumnDefinition | undefined => columns.find((column) => column.id === id),
    [columns],
  );

  const startEditAt = useCallback(
    (target: {
      readonly rowIndex: number;
      readonly columnId: ColumnId;
      readonly seed: string;
    }): void => {
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

  const handleColumnHeaderClick = useCallback((columnId: ColumnId): void => {
    setSelection({ kind: "column", columnId });
    setEditing(null);
  }, []);

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

  const headerEntries = useMemo(
    () =>
      columns.map((column) => ({
        column,
        node: renderHeader({ column, rows, support }),
      })),
    [columns, rows, support],
  );

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-background">
          <tr className="border-b">
            {headerEntries.map(({ column, node }) => (
              <th
                key={column.id}
                onClick={() => handleColumnHeaderClick(column.id)}
                className={cn(
                  "border-r px-2 py-1.5 text-left cursor-pointer select-none",
                  column.sticky === "left" && "sticky left-0 z-30 bg-background",
                  selection.kind === "column" &&
                    selection.columnId === column.id &&
                    "bg-accent text-accent-foreground",
                )}
              >
                {node}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ height: virtualizer.getTotalSize() }} className="relative block">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) {
              return null;
            }

            return (
              <tr
                key={row.filePath}
                className="absolute flex w-full border-b hover:bg-muted/50"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: virtualRow.size,
                }}
              >
                {columns.map((column) => {
                  const cellWritable = isCellWritable({ row, columnId: column.id, support });
                  const isSelected =
                    (selection.kind === "cell" &&
                      selection.rowIndex === virtualRow.index &&
                      selection.columnId === column.id) ||
                    (selection.kind === "column" && selection.columnId === column.id);
                  const isEditingCell =
                    editing !== null &&
                    editing.rowIndex === virtualRow.index &&
                    editing.columnId === column.id;
                  return (
                    // biome-ignore lint/a11y/useKeyWithClickEvents: container handles all keyboard
                    <td
                      key={column.id}
                      onClick={() => handleCellClick(virtualRow.index, column.id)}
                      onDoubleClick={() => handleCellDoubleClick(virtualRow.index, column.id)}
                      className={cn(
                        "flex shrink-0 items-center border-r px-2",
                        column.sticky === "left" && "sticky left-0 z-10 bg-background",
                        isSelected && "bg-accent/40",
                      )}
                      style={{ width: column.width }}
                    >
                      {isEditingCell && column.editable === "tag" && column.inputKind ? (
                        <EditableCell
                          field={column.id.slice("tag.".length) as keyof TagData}
                          inputKind={column.inputKind}
                          initialValue={editing.initialValue}
                          onCommit={commitFromEditor}
                          onCancel={cancelEditor}
                        />
                      ) : (
                        renderCell({
                          column,
                          row,
                          cellWritable,
                          handlers: { onOpenPictures, onOpenLyrics },
                        })
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Project a row's value for the given column to the string the editor seeds
 * itself with.
 *
 * @param row - Row currently entering edit mode.
 * @param column - Column definition of the cell being edited.
 * @returns Display string for the cell's current value, or `""` when the
 *   column is missing or the value is undefined.
 */
const readCellAsString = (row: TrackRow, column: ColumnDefinition | undefined): string => {
  if (!column) {
    return "";
  }

  const value = column.readValue(row);
  return value === undefined ? "" : String(value);
};

type DispatchPasteArgs = {
  readonly selection: Selection;
  readonly rowsLength: number;
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
