import { FolderOpen, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n/useLocale";
import type { ColumnId } from "@/features/spreadsheet/types";
import type { ResolvedTheme, ThemePreference } from "@/features/theme/types";
import type { LocalePreference } from "../../../../shared/locales/types.js";

import { ColumnsMenu } from "./ColumnsMenu";
import { LanguageMenu } from "./LanguageMenu";
import { ThemeMenu } from "./ThemeMenu";

/** Props for {@link Header}. */
export type HeaderProps = {
  /** Total number of loaded rows; drives the trailing counter. */
  readonly fileCount: number;
  /** Number of rows with unsaved edits; gates Save All / Discard. */
  readonly dirtyCount: number;
  /** Whether a load operation is in progress; collapses the toolbar. */
  readonly loading: boolean;
  /** Whether a save operation is in progress; disables actions during the run. */
  readonly saving: boolean;
  /** Visible column ids in display order; powers the columns picker checkmarks. */
  readonly visibleIds: readonly ColumnId[];
  /** Persisted locale preference; `undefined` is rendered as `"system"`. */
  readonly localePreference: LocalePreference | undefined;
  /** Persisted theme preference; `undefined` is rendered as `"system"`. */
  readonly themePreference: ThemePreference | undefined;
  /** Resolved theme applied to the document — used for the theme menu icon. */
  readonly resolvedTheme: ResolvedTheme;
  /** Open the native file picker. */
  readonly onOpenFiles: () => void;
  /** Toggle a column's visibility. */
  readonly onToggleColumn: (id: ColumnId, visible: boolean) => void;
  /** Commit a new locale preference. */
  readonly onLocaleChange: (value: LocalePreference) => void;
  /** Commit a new theme preference. */
  readonly onThemeChange: (value: ThemePreference) => void;
  /** Trigger a Save All run. */
  readonly onSaveAll: () => void;
  /** Discard every unsaved edit. */
  readonly onDiscardChanges: () => void;
};

/**
 * Top-level toolbar with the File → Open entry point, the columns picker, the
 * Save / Discard controls, and the file counter.
 *
 * Save All / Discard Changes are gated on `dirtyCount > 0`, the Columns
 * picker drives `AppSettings.columns.visibleIds`, and the `loading` / `saving`
 * flags collapse the buttons during long-running ops.
 *
 * @param props - Component props.
 * @returns The toolbar.
 */
export function Header({
  fileCount,
  dirtyCount,
  loading,
  saving,
  visibleIds,
  localePreference,
  themePreference,
  resolvedTheme,
  onOpenFiles,
  onToggleColumn,
  onLocaleChange,
  onThemeChange,
  onSaveAll,
  onDiscardChanges,
}: HeaderProps) {
  const { t } = useLocale();
  const hasDirty = dirtyCount > 0;
  const fileCountKey = fileCount === 1 ? "header.fileCount.singular" : "header.fileCount.plural";
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-3">
      <Button variant="outline" size="sm" onClick={onOpenFiles} disabled={loading || saving}>
        <FolderOpen />
        {t("header.openFiles")}
      </Button>
      <ColumnsMenu visibleIds={visibleIds} onToggle={onToggleColumn} />
      <Button
        variant="default"
        size="sm"
        onClick={onSaveAll}
        disabled={!hasDirty || saving || loading}
      >
        <Save />
        {hasDirty ? t("header.saveAllWithCount", { count: dirtyCount }) : t("header.saveAll")}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDiscardChanges}
        disabled={!hasDirty || saving || loading}
      >
        <RotateCcw />
        {t("header.discardChanges")}
      </Button>
      <div className="ml-auto flex items-center gap-3">
        <div className="text-sm text-muted-foreground tabular-nums">
          {loading ? t("header.loading") : t(fileCountKey, { count: fileCount })}
        </div>
        <LanguageMenu value={localePreference} onChange={onLocaleChange} />
        <ThemeMenu value={themePreference} resolved={resolvedTheme} onChange={onThemeChange} />
      </div>
    </header>
  );
}
