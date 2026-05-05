import type { Warning } from "../../../main/ipc/types.js";

/** Severity order used to pick the most serious entry in a warning list. */
const SEVERITY_RANK = { info: 0, warn: 1, error: 2 } as const;

/**
 * Aggregated view of a track's warnings shown in the spreadsheet.
 *
 * `label` is the short string rendered in the cell (the count, or `undefined`
 * when there are no warnings); `messages` is the per-entry message list shown
 * in the tooltip.
 */
export type WarningsSummary = {
  readonly count: number;
  readonly maxSeverity: Warning["severity"] | undefined;
  readonly label: string | undefined;
  readonly messages: readonly string[];
};

/**
 * Reduce a track's warnings into a cell summary.
 *
 * Severity is monotonically maxed across the list (`error` > `warn` > `info`)
 * so the cell can pick a tint based on the worst entry.
 *
 * @param warnings - Non-fatal diagnostics emitted by the core reader.
 * @returns Count, the highest severity present, the cell label, and per-entry
 *   message strings for tooltip rendering.
 */
export const summarizeWarnings = (warnings: readonly Warning[]): WarningsSummary => {
  if (warnings.length === 0) {
    return { count: 0, maxSeverity: undefined, label: undefined, messages: [] };
  }

  const messages = warnings.map((entry) => entry.message);
  const maxSeverity = warnings.reduce<Warning["severity"]>(
    (acc, entry) => (SEVERITY_RANK[entry.severity] > SEVERITY_RANK[acc] ? entry.severity : acc),
    "info",
  );
  return { count: warnings.length, maxSeverity, label: String(warnings.length), messages };
};
