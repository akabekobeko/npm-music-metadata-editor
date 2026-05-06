import type { Virtualizer } from "@tanstack/react-virtual";
import { useVirtualizer } from "@tanstack/react-virtual";
import { type PointerEvent as ReactPointerEvent, type RefObject, useRef } from "react";

import type { ColumnDefinition, ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import type { CommitArgs, EditingState, PasteArgs, Selection } from "./types.js";
import { useColumnResize } from "./useColumnResize.js";
import { useKeyboard } from "./useKeyboard.js";
import { useSelection } from "./useSelection.js";

/** Estimated row height (px) used by the virtualizer to size the spacer. */
const ROW_HEIGHT = 32;
/** How many rows past the viewport to keep mounted, smoothing scroll. */
const VIRTUAL_OVERSCAN = 8;

/** Args for {@link useSpreadsheet}. */
type Args = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
  /** Track rows backing the grid. */
  readonly rows: readonly TrackRow[];
  /** Per-format capability matrix used to gate writable cells. */
  readonly support: FormatSupportMap;
  /** Effective column widths in pixels, keyed by column id. */
  readonly columnWidths: Readonly<Record<ColumnId, number>>;
  /** Forward a single-cell edit to the host's edit store. */
  readonly onCommit: (args: CommitArgs) => void;
  /** Apply a clipboard paste against the current selection. */
  readonly onPaste: (args: PasteArgs) => void;
  /** Roll back the most recent edit. Bound to Cmd/Ctrl+Z. */
  readonly onUndo: () => void;
  /** Persist a new width for the dragged column. Called once per drag end. */
  readonly onColumnResize: (columnId: ColumnId, width: number) => void;
};

/** Public surface returned by {@link useSpreadsheet}. */
export type SpreadsheetState = {
  /** Ref attached to the scrollable grid container. */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** Row virtualizer; supplies the visible window plus total spacer height. */
  readonly virtualizer: Virtualizer<HTMLDivElement, Element>;
  /** Current selection — feeds visual highlight and keyboard dispatch. */
  readonly selection: Selection;
  /** Active editor state, or `null` when no cell is being edited. */
  readonly editing: EditingState | null;
  /** Effective width lookup (live-resized values override persisted widths). */
  readonly widthOf: (id: ColumnId) => number;
  /** Pointer-down handler to attach to each header's resize gripper. */
  readonly beginResize: (event: ReactPointerEvent<HTMLElement>, columnId: ColumnId) => void;
  /** Single-click handler — selects the cell and exits edit mode. */
  readonly handleCellClick: (rowIndex: number, columnId: ColumnId) => void;
  /** Double-click handler — selects the cell and opens the inline editor. */
  readonly handleCellDoubleClick: (rowIndex: number, columnId: ColumnId) => void;
  /** Header click handler — selects the column when it permits column-wide ops. */
  readonly handleColumnHeaderClick: (columnId: ColumnId) => void;
  /** Editor commit handler — fired on Enter / blur. */
  readonly commitFromEditor: (value: string | number | undefined) => void;
  /** Editor cancel handler — fired on Escape. */
  readonly cancelEditor: () => void;
};

/**
 * Compose every piece of state and side-effect the {@link Spreadsheet}
 * component needs.
 *
 * Internally orchestrates:
 *   - `useColumnResize` for the header drag-resize gripper,
 *   - `useSelection` for selection / editing state and click handlers,
 *   - `useKeyboard` for document-level shortcuts (undo, paste, type-to-edit),
 *   - `useVirtualizer` for the row windowing.
 *
 * @param args - Component props passed straight through.
 * @returns The view-model the component renders against.
 */
export const useSpreadsheet = ({
  columns,
  rows,
  support,
  columnWidths,
  onCommit,
  onPaste,
  onUndo,
  onColumnResize,
}: Args): SpreadsheetState => {
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
  } = useSelection({ columns, rows, support, onCommit });

  useKeyboard({
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

  return {
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
  };
};
