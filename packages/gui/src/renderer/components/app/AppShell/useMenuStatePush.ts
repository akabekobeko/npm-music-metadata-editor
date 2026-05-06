import type { MenuStateSnapshot } from "@mme/ipc";
import { useEffect } from "react";
import type { ColumnDefinition } from "@/features/spreadsheet/types";
import type { ResolvedTheme } from "@/features/theme/types";

/** Args for {@link useMenuStatePush}. */
type Args = {
  /** Whether the workspace has unsaved edits — gates Save / Discard items. */
  readonly hasDirty: boolean;
  /** Persisted recent-files list, newest first. */
  readonly recentFiles: readonly string[];
  /** Resolved color theme — drives the toggle item's check state. */
  readonly theme: ResolvedTheme;
  /** Visible-column id set, used to mark each known column with its checkbox state. */
  readonly visibleColumnIds: readonly string[];
  /** Every known column from the registry (label + id). */
  readonly allColumns: readonly ColumnDefinition[];
};

/**
 * Push a {@link MenuStateSnapshot} to Main whenever the dependencies change.
 *
 * Side effect: Main rebuilds the application menu so labels track the new
 * theme / dirty state / recent files / column visibility. The push is
 * fire-and-forget; a failed IPC merely leaves the menu stale.
 *
 * @param args - The menu-relevant slice of AppShell state.
 */
export const useMenuStatePush = ({
  hasDirty,
  recentFiles,
  theme,
  visibleColumnIds,
  allColumns,
}: Args): void => {
  useEffect(() => {
    const visibleSet = new Set(visibleColumnIds);
    const snapshot: MenuStateSnapshot = {
      hasDirty,
      recentFiles,
      theme,
      columns: allColumns.map((column) => ({
        id: column.id,
        label: column.title,
        visible: visibleSet.has(column.id),
      })),
    };
    window.mme.menu.setState(snapshot);
  }, [hasDirty, recentFiles, theme, visibleColumnIds, allColumns]);
};
