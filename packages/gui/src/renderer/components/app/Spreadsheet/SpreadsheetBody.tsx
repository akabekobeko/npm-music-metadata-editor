import type { Virtualizer } from "@tanstack/react-virtual";

import type { ColumnDefinition, ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";

import type { TagData } from "../../../../main/ipc/types";
import { EditableCell } from "./cells/EditableCell";
import { renderCell } from "./renderCell";
import type { EditingState, Selection } from "./types.js";
import { useCellState } from "./useCellState.js";

/** Props for {@link SpreadsheetBody}. */
export type SpreadsheetBodyProps = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
  /** Track rows to render — index into this array is the row's grid position. */
  readonly rows: readonly TrackRow[];
  /** Format support matrix — gates writable cells and the inline editor. */
  readonly support: FormatSupportMap;
  /** Current selection — drives the per-cell highlight. */
  readonly selection: Selection;
  /** Active editor state, or `null` when no cell is being edited. */
  readonly editing: EditingState | null;
  /** Row virtualizer; supplies the visible window plus total spacer height. */
  readonly virtualizer: Virtualizer<HTMLDivElement, Element>;
  /** Effective width lookup (live-resized values override persisted widths). */
  readonly widthOf: (id: ColumnId) => number;
  /** Single-click handler for a cell. */
  readonly onCellClick: (rowIndex: number, columnId: ColumnId) => void;
  /** Double-click handler for a cell. */
  readonly onCellDoubleClick: (rowIndex: number, columnId: ColumnId) => void;
  /** Editor commit handler — fired on Enter / blur. */
  readonly onCommitEditor: (value: string | number | undefined) => void;
  /** Editor cancel handler — fired on Escape. */
  readonly onCancelEditor: () => void;
  /** Open the picture-management dialog for the given row. */
  readonly onOpenPictures: (row: TrackRow) => void;
  /** Open the lyrics editor dialog for the given row. */
  readonly onOpenLyrics: (row: TrackRow) => void;
};

/**
 * Renders the spreadsheet's `<tbody>` with virtualized row windowing. Each
 * cell is either an inline editor (when the cell is being edited) or the
 * column's read-only renderer chosen by `renderCell`. Per-cell flags are
 * resolved by `useCellState`.
 *
 * @returns The rendered table body.
 */
export function SpreadsheetBody({
  columns,
  rows,
  support,
  selection,
  editing,
  virtualizer,
  widthOf,
  onCellClick,
  onCellDoubleClick,
  onCommitEditor,
  onCancelEditor,
  onOpenPictures,
  onOpenLyrics,
}: SpreadsheetBodyProps) {
  const resolveCellState = useCellState({ selection, editing, support });

  return (
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
              const { cellWritable, isSelected, isEditingCell } = resolveCellState({
                rowIndex: virtualRow.index,
                column,
                row,
              });
              return (
                // biome-ignore lint/a11y/useKeyWithClickEvents: container handles all keyboard
                <td
                  key={column.id}
                  onClick={() => onCellClick(virtualRow.index, column.id)}
                  onDoubleClick={() => onCellDoubleClick(virtualRow.index, column.id)}
                  className={cn(
                    "flex shrink-0 items-center border-r px-2",
                    column.sticky === "left" && "sticky left-0 z-10 bg-background",
                    isSelected && "bg-accent/40",
                  )}
                  style={{ width: widthOf(column.id) }}
                >
                  {isEditingCell && column.editable === "tag" && column.inputKind && editing ? (
                    <EditableCell
                      field={column.id.slice("tag.".length) as keyof TagData}
                      inputKind={column.inputKind}
                      initialValue={editing.initialValue}
                      onCommit={onCommitEditor}
                      onCancel={onCancelEditor}
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
  );
}
