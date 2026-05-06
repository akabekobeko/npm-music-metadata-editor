import { useEffect } from "react";
import type { ColumnDefinition } from "@/features/spreadsheet/types";
import type { ResolvedTheme } from "@/features/theme/types";
import type { MenuStateSnapshot } from "../../../../main/ipc/types.js";

/** Args for {@link useMenuStatePush}. */
type Args = {
  readonly hasDirty: boolean;
  readonly recentFiles: readonly string[];
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
