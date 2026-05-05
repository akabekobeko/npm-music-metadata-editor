import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

import { isCellWritable } from "@/features/spreadsheet/isCellWritable";
import type { ColumnDefinition, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";

import { renderCell } from "./renderCell";
import { renderHeader } from "./renderHeader";

/** Props for {@link Spreadsheet}. */
export type SpreadsheetProps = {
  readonly columns: readonly ColumnDefinition[];
  readonly rows: readonly TrackRow[];
  readonly support: FormatSupportMap;
  readonly onOpenPictures: (row: TrackRow) => void;
  readonly onOpenLyrics: (row: TrackRow) => void;
};

/** Estimated row height (px) used by the virtualizer to size the spacer. */
const ROW_HEIGHT = 32;
/** How many rows past the viewport to keep mounted, smoothing scroll. */
const VIRTUAL_OVERSCAN = 8;

/**
 * Headless TanStack Table wrapper that virtualizes rows and pins the file
 * column to the left.
 *
 * Phase 3 keeps the grid read-only: cells render with format-aware disabled
 * styling, but no edits happen. Phase 4 will add per-column inline editors via
 * the `editor` field on {@link ColumnDefinition} and a selection model layered
 * on top of this component.
 *
 * @param props - Spreadsheet props.
 * @returns The rendered grid.
 */
export function Spreadsheet({
  columns,
  rows,
  support,
  onOpenPictures,
  onOpenLyrics,
}: SpreadsheetProps) {
  const tableColumns = useMemo<ColumnDef<TrackRow>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        accessorFn: (row) => column.readValue(row),
        header: () => renderHeader({ column, rows, support }),
        size: column.width,
        cell: ({ row }) =>
          renderCell({
            column,
            row: row.original,
            cellWritable: isCellWritable({ row: row.original, columnId: column.id, support }),
            handlers: { onOpenPictures, onOpenLyrics },
          }),
      })),
    [columns, rows, support, onOpenPictures, onOpenLyrics],
  );

  const table = useReactTable<TrackRow>({
    data: rows as TrackRow[],
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.filePath,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const tableRows = table.getRowModel().rows;
  const virtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
  });

  return (
    <div ref={containerRef} className="relative h-full overflow-auto">
      <table className="w-full table-fixed border-collapse text-sm">
        <colgroup>
          {columns.map((column) => (
            <col key={column.id} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-background">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b">
              {group.headers.map((header) => {
                const column = findColumn(columns, header.column.id);
                const sticky = column?.sticky === "left";
                return (
                  <th
                    key={header.id}
                    className={cn(
                      "border-r px-2 py-1.5 text-left",
                      sticky && "sticky left-0 z-30 bg-background",
                    )}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody style={{ height: virtualizer.getTotalSize() }} className="relative block">
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const tableRow = tableRows[virtualRow.index];
            if (!tableRow) {
              return null;
            }

            return (
              <tr
                key={tableRow.id}
                className="absolute flex w-full border-b hover:bg-muted/50"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: virtualRow.size,
                }}
              >
                {tableRow.getVisibleCells().map((cell) => {
                  const column = findColumn(columns, cell.column.id);
                  const sticky = column?.sticky === "left";
                  return (
                    <td
                      key={cell.id}
                      className={cn(
                        "flex shrink-0 items-center border-r px-2",
                        sticky && "sticky left-0 z-10 bg-background",
                      )}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
 * Look up a column definition by its id.
 *
 * @param columns - Column definitions in render order.
 * @param id - Column id to find.
 * @returns The matching column, or `undefined` when not present.
 */
const findColumn = (
  columns: readonly ColumnDefinition[],
  id: string,
): ColumnDefinition | undefined => columns.find((column) => column.id === id);
