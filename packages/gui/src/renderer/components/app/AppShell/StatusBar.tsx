/** Props for {@link StatusBar}. */
export type StatusBarProps = {
  /** Total number of loaded rows. */
  readonly fileCount: number;
  /** Number of rows with unsaved edits. */
  readonly dirtyCount: number;
  /** Number of rows reporting at least one warning after load. */
  readonly warningCount: number;
  /**
   * Transient summary appended to the right of the bar (e.g. paste outcome).
   * `null` hides the slot entirely.
   */
  readonly transient: string | null;
};

/**
 * Bottom status bar showing aggregate counters and transient action summaries.
 *
 * Counters refresh every render; transient text fades out after the parent
 * clears it (auto-cleared by `useTransientStatus` after `TRANSIENT_STATUS_MS`).
 *
 * @returns The bar.
 */
export function StatusBar({ fileCount, dirtyCount, warningCount, transient }: StatusBarProps) {
  return (
    <footer
      role="status"
      className="flex h-7 shrink-0 items-center gap-3 border-t bg-background px-3 text-xs text-muted-foreground tabular-nums"
    >
      <span>{`${fileCount} ${fileCount === 1 ? "file" : "files"}`}</span>
      <span>{`${dirtyCount} edited`}</span>
      <span>{`${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`}</span>
      {transient !== null ? <span className="ml-auto text-foreground">{transient}</span> : null}
    </footer>
  );
}
