import type { ColumnDefinition } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

/**
 * Project a row's value for the given column to the string the editor seeds
 * itself with.
 *
 * @param row - Row currently entering edit mode.
 * @param column - Column definition of the cell being edited.
 * @returns Display string for the cell's current value, or `""` when the
 *   column is missing or the value is undefined.
 */
export const readCellAsString = (row: TrackRow, column: ColumnDefinition | undefined): string => {
  if (!column) {
    return "";
  }

  const value = column.readValue(row);
  return value === undefined ? "" : String(value);
};
