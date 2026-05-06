import type { ColumnDefinition } from "./types.js";

/**
 * Decide whether a column reacts to header clicks with column-wide selection.
 *
 * Mirrors the default semantics of {@link ColumnDefinition.selectable}: when
 * the column omits the field we treat it as `"column"` so existing registry
 * entries keep their Phase 4 behaviour. Columns explicitly marked
 * `"cell-only"` (`lyrics`, `pictures`) opt out, and the header click handler
 * turns into a no-op for them.
 *
 * @param column - Column definition under inspection.
 * @returns `true` when the header click should select the whole column.
 */
export const isColumnSelectable = (column: ColumnDefinition): boolean =>
  (column.selectable ?? "column") === "column";
