import type { PointerEvent as ReactPointerEvent } from "react";

import type { ColumnDefinition, ColumnId } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";

import type { Selection } from "../types.js";
import { useSpreadsheetHeader } from "./useSpreadsheetHeader.js";

/** Props for {@link SpreadsheetHeader}. */
export type SpreadsheetHeaderProps = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
  /** Track rows — passed through to per-column header renderers for summary state. */
  readonly rows: readonly TrackRow[];
  /** Current selection — used to highlight a column when one is selected. */
  readonly selection: Selection;
  /** Single-click handler for a column header. */
  readonly onHeaderClick: (columnId: ColumnId) => void;
  /** Pointer-down handler for the right-edge resize gripper. */
  readonly onBeginResize: (event: ReactPointerEvent<HTMLElement>, columnId: ColumnId) => void;
};

/**
 * Renders the spreadsheet's `<thead>` row, including the per-column resize
 * gripper. Header cell content is delegated to `renderHeader` (via
 * `useSpreadsheetHeader`), which knows the registry-specific affordances such
 * as status badges and sort markers.
 *
 * @returns The rendered table header.
 */
export function SpreadsheetHeader({
  columns,
  rows,
  selection,
  onHeaderClick,
  onBeginResize,
}: SpreadsheetHeaderProps) {
  const headerEntries = useSpreadsheetHeader({ columns, rows });

  return (
    <thead className="sticky top-0 z-20 bg-background">
      <tr className="border-b">
        {headerEntries.map(({ column, node, selectable }) => (
          <th
            key={column.id}
            onClick={() => onHeaderClick(column.id)}
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
            {/* biome-ignore lint/a11y/noStaticElementInteractions: column resize is intentionally pointer-only — keyboard column sizing is not in scope */}
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: ditto — onClick is only used to swallow header-click bubbling */}
            <span
              data-testid={`resize-handle-${column.id}`}
              title={`Resize ${column.title} column`}
              className="absolute right-0 top-0 z-40 h-full w-1.5 cursor-col-resize select-none hover:bg-accent"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => onBeginResize(event, column.id)}
            />
          </th>
        ))}
      </tr>
    </thead>
  );
}
