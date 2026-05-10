import { type ReactNode, useMemo } from "react";

import { isColumnSelectable } from "@/features/spreadsheet/isColumnSelectable";
import type { ColumnDefinition } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import { renderHeader } from "./renderHeader";

/** Args for {@link useSpreadsheetHeader}. */
type Args = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
  /** Track rows passed into per-column header renderers (e.g., for summary state). */
  readonly rows: readonly TrackRow[];
};

/** Pre-computed metadata for one header cell. */
export type HeaderEntry = {
  /** Underlying column definition. */
  readonly column: ColumnDefinition;
  /** Pre-rendered header content node. */
  readonly node: ReactNode;
  /** Whether the column accepts column-wide selection / paste. */
  readonly selectable: boolean;
};

/**
 * Pre-compute the per-column header metadata the spreadsheet renders.
 *
 * Memoised against `columns / rows` so re-renders driven by selection or
 * edit-mode changes do not re-run `renderHeader`.
 *
 * @param args - Columns and rows.
 * @returns One {@link HeaderEntry} per visible column.
 */
export const useSpreadsheetHeader = ({ columns, rows }: Args): readonly HeaderEntry[] =>
  useMemo(
    () =>
      columns.map((column) => ({
        column,
        node: renderHeader({ column, rows }),
        selectable: isColumnSelectable(column),
      })),
    [columns, rows],
  );
