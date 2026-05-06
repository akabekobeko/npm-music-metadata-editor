import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

import type { PasteSelectionMode } from "@/features/edit/expandColumnPaste";
import { isCellWritable } from "@/features/spreadsheet/isCellWritable";
import { isColumnSelectable } from "@/features/spreadsheet/isColumnSelectable";
import type { ColumnDefinition, ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";
import type { TagData } from "../../../../main/ipc/types";

import { EditableCell } from "./cells/EditableCell";
import { renderCell } from "./renderCell";
import { renderHeader } from "./renderHeader";
import { useColumnResize } from "./useColumnResize.js";
import { useSpreadsheetKeyboard } from "./useSpreadsheetKeyboard.js";
import { useSpreadsheetSelection } from "./useSpreadsheetSelection.js";

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
  /**
   * Effective column widths in pixels, keyed by column id. Built from
   * `AppSettings.columns.widths` plus registry fallbacks (see
   * `resolveColumnWidths`).
   */
  readonly columnWidths: Readonly<Record<ColumnId, number>>;
  readonly onOpenPictures: (row: TrackRow) => void;
  readonly onOpenLyrics: (row: TrackRow) => void;
  readonly onCommit: (args: CommitArgs) => void;
  readonly onPaste: (args: PasteArgs) => void;
  readonly onUndo: () => void;
  /** Persist a new width for the dragged column. Called once per drag end. */
  readonly onColumnResize: (columnId: ColumnId, width: number) => void;
};

/** Estimated row height (px) used by the virtualizer to size the spacer. */
const ROW_HEIGHT = 32;
/** How many rows past the viewport to keep mounted, smoothing scroll. */
const VIRTUAL_OVERSCAN = 8;

/**
 * Virtualized grid with cell selection, inline editing, undo, and column
 * paste.
 *
 * Behaviour is split across three colocated hooks:
 *   - `useSpreadsheetSelection` owns selection / editing state and the
 *     pointer-driven cell + header click handlers.
 *   - `useSpreadsheetKeyboard` wires document-level shortcuts (undo, paste,
 *     enter / type-to-edit) to the selection.
 *   - `useColumnResize` drives the header drag-resize gripper.
 *
 * Mutations propagate upward through the `onCommit` / `onPaste` / `onUndo`
 * callbacks so the edit store stays the single source of truth for rows.
 *
 * @returns The rendered grid.
 */
export function Spreadsheet({
  columns,
  rows,
  support,
  columnWidths,
  onOpenPictures,
  onOpenLyrics,
  onCommit,
  onPaste,
  onUndo,
  onColumnResize,
}: SpreadsheetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { liveWidths, beginResize } = useColumnResize({
    baseWidths: columnWidths,
    onColumnResize,
  });
  const widthOf = (id: ColumnId): number => liveWidths[id] ?? columnWidths[id] ?? 0;

  const {
    selection,
    editing,
    findColumn,
    startEditAt,
    commitFromEditor,
    cancelEditor,
    handleCellClick,
    handleCellDoubleClick,
    handleColumnHeaderClick,
  } = useSpreadsheetSelection({ columns, rows, support, onCommit });

  useSpreadsheetKeyboard({
    editing,
    selection,
    rows,
    findColumn,
    startEditAt,
    onPaste,
    onUndo,
  });

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
  });

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
            <col key={column.id} style={{ width: widthOf(column.id) }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-background">
          <tr className="border-b">
            {headerEntries.map(({ column, node }) => {
              const selectable = isColumnSelectable(column);
              return (
                <th
                  key={column.id}
                  onClick={() => handleColumnHeaderClick(column.id)}
                  title={
                    selectable
                      ? undefined
                      : `${column.title} is editable per cell only — column-wide paste is disabled.`
                  }
                  className={cn(
                    "relative border-r px-2 py-1.5 text-left select-none",
                    selectable ? "cursor-pointer" : "cursor-default",
                    column.sticky === "left" && "sticky left-0 z-30 bg-background",
                    selection.kind === "column" &&
                      selection.columnId === column.id &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  {node}
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: column resize is a pointer-only affordance; keyboard column sizing is deferred to Phase 7 */}
                  {/* biome-ignore lint/a11y/useKeyWithClickEvents: ditto — onClick is only used to swallow header-click bubbling */}
                  <span
                    data-testid={`resize-handle-${column.id}`}
                    title={`Resize ${column.title} column`}
                    className="absolute right-0 top-0 z-40 h-full w-1.5 cursor-col-resize select-none hover:bg-accent"
                    onClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => beginResize(event, column.id)}
                  />
                </th>
              );
            })}
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
                      style={{ width: widthOf(column.id) }}
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
