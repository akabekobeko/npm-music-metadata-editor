import type { TranslateFn } from "@/features/i18n/useLocale";

type PasteOutcome = {
  /** Cells that received the pasted value. */
  readonly applied: number;
  /** Cells skipped because the target format cannot persist the field. */
  readonly skippedUnsupported: number;
  /** Cells skipped because the value failed validation. */
  readonly skippedInvalid: number;
};

/**
 * Build the transient status sentence shown after a paste.
 *
 * @param t - Locale-bound translation helper from `useLocale`.
 * @param outcome - Counters produced by `applyPaste`.
 * @returns A single-sentence summary of the paste action.
 */
export const formatPasteSummary = (t: TranslateFn, outcome: PasteOutcome): string =>
  t("paste.summary", {
    applied: outcome.applied,
    skippedUnsupported: outcome.skippedUnsupported,
    skippedInvalid: outcome.skippedInvalid,
  });
