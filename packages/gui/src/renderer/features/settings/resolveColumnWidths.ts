import type { ColumnDefinition, ColumnId } from "../spreadsheet/types.js";

/**
 * Lower bound applied to user-resized column widths.
 *
 * Exposes a usable column even after a careless full-width drag — without it,
 * a column can collapse to 0 px and become impossible to grab again.
 */
export const MIN_COLUMN_WIDTH = 48;

/**
 * Compose a runtime width map: persisted widths win, registry defaults fill in
 * the rest. Widths smaller than {@link MIN_COLUMN_WIDTH} are clamped up so a
 * malformed setting cannot hide a column entirely.
 *
 * Returned as `Record<ColumnId, number>` (a plain object) rather than a `Map`
 * so consumers can spread it through component props without an extra
 * conversion step.
 *
 * @param columns - Currently-visible columns in render order.
 * @param widths - Persisted user-defined widths keyed by column id.
 * @returns A plain object keyed by column id, holding the resolved width in px.
 */
export const resolveColumnWidths = (
  columns: readonly ColumnDefinition[],
  widths: Readonly<Record<string, number>>,
): Readonly<Record<ColumnId, number>> => {
  const entries = columns.map((column) => {
    const persisted = widths[column.id];
    const value =
      persisted !== undefined && Number.isFinite(persisted) && persisted > 0
        ? persisted
        : column.width;
    return [column.id, Math.max(MIN_COLUMN_WIDTH, value)] as const;
  });
  return Object.fromEntries(entries) as Record<ColumnId, number>;
};
