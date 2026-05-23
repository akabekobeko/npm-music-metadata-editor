import type { PointerEvent as ReactPointerEvent } from "react";

import type { ColumnDefinition, ColumnId } from "@/features/spreadsheet/types";
import { cn } from "@/libs/utils";

import type { Selection } from "../types.js";
import { useColumnDragAndDrop } from "./useColumnDragAndDrop.js";
import { useSpreadsheetHeader } from "./useSpreadsheetHeader.js";

/** Props for {@link SpreadsheetHeader}. */
export type SpreadsheetHeaderProps = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
  /** Current selection — used to highlight a column when one is selected. */
  readonly selection: Selection;
  /** Single-click handler for a column header. */
  readonly onHeaderClick: (columnId: ColumnId) => void;
  /** Pointer-down handler for the right-edge resize gripper. */
  readonly onBeginResize: (event: ReactPointerEvent<HTMLElement>, columnId: ColumnId) => void;
  /** Persist a new column order after a successful header drag-and-drop. */
  readonly onColumnReorder: (orderedIds: readonly ColumnId[]) => void;
};

/**
 * Renders the spreadsheet's `<thead>` row, including the per-column resize
 * gripper and the drag-and-drop affordances for column reordering. Header
 * cell content is delegated to `renderHeader` (via `useSpreadsheetHeader`),
 * which knows the registry-specific affordances such as status badges and
 * sort markers. Reorder state lives in `useColumnDragAndDrop`.
 *
 * The drag source is an inner `<div draggable>` rather than the `<th>` itself
 * because Chromium does not reliably fire `dragstart` on table cells — the
 * native HTML5 DnD pipeline silently drops the event for `<th>` / `<td>`,
 * which manifests as drop never running. The inner wrapper sidesteps that and
 * still inherits the cell's bounding box for `dropSide` calculations.
 *
 * @returns The rendered table header.
 */
export function SpreadsheetHeader({
  columns,
  selection,
  onHeaderClick,
  onBeginResize,
  onColumnReorder,
}: SpreadsheetHeaderProps) {
  const headerEntries = useSpreadsheetHeader({ columns });
  const visibleIds = columns.map((column) => column.id);
  const dnd = useColumnDragAndDrop({ visibleIds, onColumnReorder });

  return (
    <thead className="sticky top-0 z-20 bg-background">
      <tr>
        {headerEntries.map(({ column, node, selectable }) => {
          const isDragging = dnd.draggingId === column.id;
          const isDropTarget = dnd.dropTargetId === column.id && dnd.draggingId !== null;
          const draggable = dnd.canDrag(column.id);
          return (
            <th
              key={column.id}
              className={cn(
                "relative border-r border-b p-0 text-left select-none",
                selection.kind === "column" &&
                  selection.columnId === column.id &&
                  "bg-accent text-accent-foreground",
              )}
            >
              {/* biome-ignore lint/a11y/noStaticElementInteractions: header click is column-selection only; keyboard reordering is out of scope */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: ditto — onClick only mirrors the existing header-click affordance */}
              <div
                draggable={draggable}
                onClick={() => {
                  // Suppress the click that some Chromium builds fire after a
                  // short drag, which would otherwise overwrite the selection.
                  if (dnd.draggingId !== null) {
                    return;
                  }
                  onHeaderClick(column.id);
                }}
                onDragStart={(event) => dnd.onDragStart(event, column.id)}
                onDragEnter={(event) => dnd.onDragEnter(event, column.id)}
                onDragOver={(event) => dnd.onDragOver(event, column.id)}
                onDragLeave={(event) => dnd.onDragLeave(event, column.id)}
                onDrop={(event) => dnd.onDrop(event, column.id)}
                onDragEnd={dnd.onDragEnd}
                title={
                  selectable
                    ? undefined
                    : `${column.title} is editable per cell only — column-wide paste is disabled.`
                }
                className={cn(
                  "relative h-full w-full px-2 py-1.5",
                  selectable ? "cursor-pointer" : "cursor-default",
                  isDragging && "opacity-50",
                )}
                data-dragging={isDragging ? "true" : undefined}
                data-drop-target={isDropTarget ? (dnd.dropSide ?? undefined) : undefined}
              >
                {node}
                {isDropTarget && dnd.dropSide !== null && (
                  <span
                    aria-hidden="true"
                    data-testid={`drop-indicator-${column.id}`}
                    className={cn(
                      "pointer-events-none absolute top-0 z-50 h-full w-0.5 bg-primary",
                      dnd.dropSide === "before" ? "left-0" : "right-0",
                    )}
                  />
                )}
              </div>
              {/* biome-ignore lint/a11y/noStaticElementInteractions: column resize is intentionally pointer-only — keyboard column sizing is not in scope */}
              {/* biome-ignore lint/a11y/useKeyWithClickEvents: ditto — onClick is only used to swallow header-click bubbling */}
              <span
                data-testid={`resize-handle-${column.id}`}
                title={`Resize ${column.title} column`}
                draggable={false}
                className="absolute right-0 top-0 z-40 h-full w-1.5 cursor-col-resize select-none hover:bg-accent"
                onClick={(event) => event.stopPropagation()}
                onMouseDown={(event) => event.stopPropagation()}
                onPointerDown={(event) => onBeginResize(event, column.id)}
              />
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
