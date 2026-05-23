import type { ReactNode } from "react";

import { isColumnSelectable } from "@/features/spreadsheet/isColumnSelectable";
import type { ColumnDefinition } from "@/features/spreadsheet/types";

import { renderHeader } from "./renderHeader";

/** Args for {@link useSpreadsheetHeader}. */
type Args = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
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
 * @param args - Columns.
 * @returns One {@link HeaderEntry} per visible column.
 */
export const useSpreadsheetHeader = ({ columns }: Args): readonly HeaderEntry[] =>
  columns.map((column) => ({
    column,
    node: renderHeader({ column }),
    selectable: isColumnSelectable(column),
  }));
