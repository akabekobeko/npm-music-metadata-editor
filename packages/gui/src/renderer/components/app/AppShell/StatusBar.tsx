import { useLocale } from "@/features/i18n/useLocale";

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
  const { t } = useLocale();
  const fileCountKey = fileCount === 1 ? "header.fileCount.singular" : "header.fileCount.plural";
  const warningKey = warningCount === 1 ? "status.warning.singular" : "status.warning.plural";
  return (
    <footer
      role="status"
      className="flex shrink-0 items-center gap-3 px-6 py-3 border-t bg-background text-xs text-muted-foreground tabular-nums"
    >
      <span>{t(fileCountKey, { count: fileCount })}</span>
      <span>{t("status.edited", { count: dirtyCount })}</span>
      <span>{t(warningKey, { count: warningCount })}</span>
      {transient !== null ? <span className="ml-auto text-foreground">{transient}</span> : null}
    </footer>
  );
}
