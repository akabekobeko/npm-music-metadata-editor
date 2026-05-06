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
 * @param outcome - Counters produced by `applyPaste`.
 * @returns A single-sentence summary of the paste action.
 */
export const formatPasteSummary = (outcome: PasteOutcome): string =>
  `Pasted ${outcome.applied} values, skipped ${outcome.skippedUnsupported} unsupported, ${outcome.skippedInvalid} invalid`;
