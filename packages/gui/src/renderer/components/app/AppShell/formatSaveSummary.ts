import type { TranslateFn } from "@/features/i18n/useLocale";
import type { SaveResult } from "@/features/save/types";

/** Args for {@link formatSaveSummary}. */
export type FormatSaveSummaryArgs = {
  /** Locale-bound translation helper from `useLocale`. */
  readonly t: TranslateFn;
  /** Per-row outcomes from `saveDirtyRows`. */
  readonly results: readonly SaveResult[];
  /** Whether the loop bailed before reaching every row. */
  readonly cancelled: boolean;
};

/**
 * Build the transient status sentence shown after a Save All run terminates.
 *
 * @param args - Translation helper plus the loop's per-row outcomes.
 * @returns A single-sentence summary, e.g. "Saved 4 of 5 (1 error)".
 */
export const formatSaveSummary = ({ t, results, cancelled }: FormatSaveSummaryArgs): string => {
  const total = results.length;
  const errors = results.filter((r) => r.error !== undefined).length;
  const ok = total - errors;
  const head = t("save.summary", { ok, total });
  const errorKey =
    errors === 0
      ? null
      : errors === 1
        ? "save.summary.errors.singular"
        : "save.summary.errors.plural";
  const errorPart = errorKey === null ? "" : t(errorKey, { count: errors });
  const cancelledPart = cancelled ? t("save.summary.cancelled") : "";
  return `${head}${errorPart}${cancelledPart}`;
};
