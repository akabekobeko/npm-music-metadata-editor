import { FolderOpen, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ColumnId } from "@/features/spreadsheet/types";

import { ColumnsMenu } from "./ColumnsMenu";

/** Props for {@link Header}. */
export type HeaderProps = {
  readonly fileCount: number;
  readonly dirtyCount: number;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly visibleIds: readonly ColumnId[];
  readonly onOpenFiles: () => void;
  readonly onToggleColumn: (id: ColumnId, visible: boolean) => void;
  readonly onSaveAll: () => void;
  readonly onDiscardChanges: () => void;
};

/**
 * Top-level toolbar with the File → Open entry point, the columns picker, the
 * Save / Discard controls, and the file counter.
 *
 * Phase 6 grows this from a single Open button into the full save-flow header:
 * Save All / Discard Changes are gated on `dirtyCount > 0`, the Columns
 * picker drives `AppSettings.columns.visibleIds`, and the loading / saving
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
  onOpenFiles,
  onToggleColumn,
  onSaveAll,
  onDiscardChanges,
}: HeaderProps) {
  const hasDirty = dirtyCount > 0;
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-3">
      <h1 className="font-heading text-base font-semibold">Music Metadata Editor</h1>
      <Button variant="outline" size="sm" onClick={onOpenFiles} disabled={loading || saving}>
        <FolderOpen />
        Open Audio Files…
      </Button>
      <ColumnsMenu visibleIds={visibleIds} onToggle={onToggleColumn} />
      <Button
        variant="default"
        size="sm"
        onClick={onSaveAll}
        disabled={!hasDirty || saving || loading}
      >
        <Save />
        Save All{hasDirty ? ` (${dirtyCount})` : ""}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onDiscardChanges}
        disabled={!hasDirty || saving || loading}
      >
        <RotateCcw />
        Discard Changes
      </Button>
      <div className="ml-auto text-sm text-muted-foreground tabular-nums">
        {loading ? "Loading…" : `${fileCount} ${fileCount === 1 ? "file" : "files"}`}
      </div>
    </header>
  );
}
