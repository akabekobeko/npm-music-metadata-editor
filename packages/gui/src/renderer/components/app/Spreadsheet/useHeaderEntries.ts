import { type ReactNode, useMemo } from "react";

import { isColumnSelectable } from "@/features/spreadsheet/isColumnSelectable";
import type { ColumnDefinition, FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import { renderHeader } from "./renderHeader";

/** Args for {@link useHeaderEntries}. */
type Args = {
  /** Visible columns in display order. */
  readonly columns: readonly ColumnDefinition[];
  /** Track rows passed into per-column header renderers (e.g., for summary state). */
  readonly rows: readonly TrackRow[];
  /** Format support matrix used by the per-column header renderers. */
  readonly support: FormatSupportMap;
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
 * Memoised against `columns / rows / support` so re-renders driven by
 * selection or edit-mode changes do not re-run `renderHeader`.
 *
 * @param args - Columns, rows, and the format support matrix.
 * @returns One {@link HeaderEntry} per visible column.
 */
export const useHeaderEntries = ({ columns, rows, support }: Args): readonly HeaderEntry[] =>
  useMemo(
    () =>
      columns.map((column) => ({
        column,
        node: renderHeader({ column, rows, support }),
        selectable: isColumnSelectable(column),
      })),
    [columns, rows, support],
  );
