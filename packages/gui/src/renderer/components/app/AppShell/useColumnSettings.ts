import { useCallback, useMemo } from "react";

import { resolveColumnWidths } from "@/features/settings/resolveColumnWidths";
import type { AppSettings, UpdateSettings } from "@/features/settings/types";
import { buildColumns } from "@/features/spreadsheet/buildColumns";
import type { ColumnDefinition, ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";

/** Args for {@link useColumnSettings}. */
type Args = {
  /** Current settings snapshot. */
  readonly settings: AppSettings;
  /** Patch helper from the settings store. */
  readonly setSettings: UpdateSettings;
  /** Format support matrix needed by `buildColumns`. */
  readonly support: FormatSupportMap;
};

/** Public surface returned by {@link useColumnSettings}. */
export type ColumnSettings = {
  /** Visible column ids in display order, narrowed to the registry's discriminator. */
  readonly visibleIds: readonly ColumnId[];
  /** Memoised column definitions matching `visibleIds`. */
  readonly columns: readonly ColumnDefinition[];
  /** Effective per-column pixel widths, including registry fallbacks. */
  readonly columnWidths: Readonly<Record<ColumnId, number>>;
  /** Toggle a column's visibility and persist the change. */
  readonly toggleColumn: (id: ColumnId, visible: boolean) => void;
  /** Persist a new width for the resized column. */
  readonly resizeColumn: (id: ColumnId, width: number) => void;
};

/**
 * Project the persisted column settings onto the data the spreadsheet needs.
 *
 * Centralises three concerns the AppShell would otherwise scatter:
 *   1. `visibleIds` cast to the `ColumnId` discriminator (the persisted shape
 *      is just `string[]` so settings doesn't depend on the renderer's column
 *      registry).
 *   2. `buildColumns(visibleIds, support)` and `resolveColumnWidths(...)` both
 *      memoised to keep render-time work proportional to actual changes.
 *   3. Toggle / resize handlers that emit minimal `setSettings` patches.
 *
 * @param args - Settings, patch helper, and format support matrix.
 * @returns Memoised column metadata plus the toggle / resize helpers.
 */
export const useColumnSettings = ({ settings, setSettings, support }: Args): ColumnSettings => {
  const visibleIds = settings.columns.visibleIds as readonly ColumnId[];
  const columns = useMemo(() => buildColumns(visibleIds, support), [visibleIds, support]);
  const columnWidths = useMemo(
    () => resolveColumnWidths(columns, settings.columns.widths),
    [columns, settings.columns.widths],
  );

  const toggleColumn = useCallback(
    (id: ColumnId, visible: boolean): void => {
      const current = settings.columns.visibleIds;
      const next = visible
        ? current.includes(id)
          ? current
          : [...current, id]
        : current.filter((value) => value !== id);
      setSettings({ columns: { visibleIds: next } });
    },
    [settings.columns.visibleIds, setSettings],
  );

  const resizeColumn = useCallback(
    (id: ColumnId, width: number): void => {
      setSettings({ columns: { widths: { [id]: width } } });
    },
    [setSettings],
  );

  return { visibleIds, columns, columnWidths, toggleColumn, resizeColumn };
};
