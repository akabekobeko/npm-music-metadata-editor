import { COLUMN_REGISTRY } from "./constants.js";
import type { ColumnDefinition, ColumnId, FormatSupportMap } from "./types.js";

/**
 * Resolve the ordered list of column definitions to render.
 *
 * `fileName` is always pinned to the left, even when the caller's
 * `visibleIds` omits it: the column carries the row identity, so the grid is
 * unusable without it. Duplicate ids are de-duplicated while preserving the
 * caller's order.
 *
 * The format support matrix is accepted for signature stability — column
 * shape itself never depends on `support`. Per-column "writable count" hints
 * are computed in `renderHeader.tsx` using the same matrix, and per-cell
 * write gating goes through `isCellWritable`.
 *
 * @param visibleIds - Column ids the user wants to display, in display order.
 * @param _support - Format support matrix from `mme:formatSupport:list`.
 *   Currently unused here; reserved so callers don't have to change shape if
 *   the column registry ever needs to react to format support.
 * @returns Column definitions in render order.
 */
export const buildColumns = (
  visibleIds: readonly ColumnId[],
  _support: FormatSupportMap,
): readonly ColumnDefinition[] => {
  const seen = new Set<ColumnId>();
  const ordered: readonly ColumnId[] = visibleIds.includes("fileName")
    ? visibleIds
    : ["fileName", ...visibleIds];
  return ordered
    .filter((id) => {
      if (seen.has(id)) {
        return false;
      }

      seen.add(id);
      return true;
    })
    .map((id) => COLUMN_REGISTRY[id]);
};
