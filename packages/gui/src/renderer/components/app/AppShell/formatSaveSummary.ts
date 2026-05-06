import type { SaveResult } from "@/features/save/types";

/**
 * Build the transient status sentence shown after a Save All run terminates.
 *
 * @param results - Per-row outcomes from `saveDirtyRows`.
 * @param cancelled - Whether the loop bailed before reaching every row.
 * @returns A single-sentence summary, e.g. "Saved 4 of 5 (1 error)".
 */
export const formatSaveSummary = (results: readonly SaveResult[], cancelled: boolean): string => {
  const total = results.length;
  const errors = results.filter((r) => r.error !== undefined).length;
  const ok = total - errors;
  const errorPart = errors === 0 ? "" : ` (${errors} ${errors === 1 ? "error" : "errors"})`;
  const cancelledPart = cancelled ? " — cancelled" : "";
  return `Saved ${ok} of ${total}${errorPart}${cancelledPart}`;
};
