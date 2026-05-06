import type { ReactNode } from "react";

import { isCellWritable } from "@/features/spreadsheet/isCellWritable";
import type { ColumnDefinition, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import { FileNameHeaderCell } from "./FileNameHeaderCell";

type Args = {
  /** Column definition currently being rendered. */
  readonly column: ColumnDefinition;
  /** Open spreadsheet rows. */
  readonly rows: readonly TrackRow[];
  /** Format support matrix from `mme:formatSupport:list`. */
  readonly support: FormatSupportMap;
};

/**
 * Render a column header.
 *
 * Tag columns get a `(writable/total)` suffix that shows how many of the open
 * rows can persist that field — when a non-supporting format is loaded, the
 * suffix turns from `(N/N)` to `(N-1/N)` and the user notices a row is being
 * grayed out without scanning every cell. The pinned `fileName` column has a
 * dedicated header showing the file count.
 *
 * @returns The header content.
 */
export const renderHeader = ({ column, rows, support }: Args): ReactNode => {
  if (column.id === "fileName") {
    return <FileNameHeaderCell fileCount={rows.length} />;
  }

  if (column.editable === "never") {
    return <span className="font-medium">{column.title}</span>;
  }

  const writableCount = rows.filter((row) =>
    isCellWritable({ row, columnId: column.id, support }),
  ).length;
  return (
    <span className="flex items-baseline gap-1">
      <span className="font-medium">{column.title}</span>
      {rows.length > 0 ? (
        <span className="text-xs text-muted-foreground tabular-nums">
          ({writableCount}/{rows.length})
        </span>
      ) : null}
    </span>
  );
};
