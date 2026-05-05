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
 * The format support matrix is accepted for API stability with Phase 4 (which
 * will use it to compute per-column "writable count" hints in headers); Phase
 * 3 only consults it inside `isCellWritable` to disable individual cells, so
 * the column shape itself does not depend on `support` yet.
 *
 * @param visibleIds - Column ids the user wants to display, in display order.
 * @param _support - Format support matrix from `mme:formatSupport:list`. Phase
 *   3 reserves the parameter; the column shape does not depend on it yet.
 * @returns Column definitions in render order.
 */
export const buildColumns = (
  visibleIds: readonly ColumnId[],
  // Phase 3 keeps the parameter for API stability — see TSDoc.
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
