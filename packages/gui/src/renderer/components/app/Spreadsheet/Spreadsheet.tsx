import type { ColumnDefinition, ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import { SpreadsheetBody } from "./SpreadsheetBody";
import { SpreadsheetHeader } from "./SpreadsheetHeader";
import type { CommitArgs, PasteArgs } from "./types.js";
import { useSpreadsheet } from "./useSpreadsheet.js";

/** Props for {@link Spreadsheet}. */
export type SpreadsheetProps = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
  /** Track rows to render — array index doubles as the row's grid position. */
  readonly rows: readonly TrackRow[];
  /** Per-format capability matrix used to gate read-only versus writable cells. */
  readonly support: FormatSupportMap;
  /**
   * Effective column widths in pixels, keyed by column id. Built from
   * `AppSettings.columns.widths` plus registry fallbacks (see
   * `resolveColumnWidths`).
   */
  readonly columnWidths: Readonly<Record<ColumnId, number>>;
  /** Open the picture-management dialog for the given row. */
  readonly onOpenPictures: (row: TrackRow) => void;
  /** Open the lyrics editor dialog for the given row. */
  readonly onOpenLyrics: (row: TrackRow) => void;
  /** Forward a single-cell edit to the host's edit store. */
  readonly onCommit: (args: CommitArgs) => void;
  /** Apply a clipboard paste against the current selection. */
  readonly onPaste: (args: PasteArgs) => void;
  /** Roll back the most recent edit. Bound to Cmd/Ctrl+Z. */
  readonly onUndo: () => void;
  /** Persist a new width for the dragged column. Called once per drag end. */
  readonly onColumnResize: (columnId: ColumnId, width: number) => void;
};

/**
 * Virtualized grid with cell selection, inline editing, undo, and column
 * paste.
 *
 * All state and side-effects live in `useSpreadsheet` (which composes
 * `useColumnResize`, `useSelection`, and `useKeyboard`); this component only
 * arranges the JSX. Rendering itself is split into `SpreadsheetHeader`
 * (`<thead>`) and `SpreadsheetBody` (virtualized `<tbody>`).
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
  const {
    containerRef,
    virtualizer,
    selection,
    editing,
    widthOf,
    beginResize,
    handleCellClick,
    handleCellDoubleClick,
    handleColumnHeaderClick,
    commitFromEditor,
    cancelEditor,
  } = useSpreadsheet({
    columns,
    rows,
    support,
    columnWidths,
    onCommit,
    onPaste,
    onUndo,
    onColumnResize,
  });

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: widthOf(column.id) }} />
          ))}
        </colgroup>
        <SpreadsheetHeader
          columns={columns}
          rows={rows}
          support={support}
          selection={selection}
          onHeaderClick={handleColumnHeaderClick}
          onBeginResize={beginResize}
        />
        <SpreadsheetBody
          columns={columns}
          rows={rows}
          support={support}
          selection={selection}
          editing={editing}
          virtualizer={virtualizer}
          widthOf={widthOf}
          onCellClick={handleCellClick}
          onCellDoubleClick={handleCellDoubleClick}
          onCommitEditor={commitFromEditor}
          onCancelEditor={cancelEditor}
          onOpenPictures={onOpenPictures}
          onOpenLyrics={onOpenLyrics}
        />
      </table>
    </div>
  );
}
