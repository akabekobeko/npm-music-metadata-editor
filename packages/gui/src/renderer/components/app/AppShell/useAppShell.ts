import { useEffect } from "react";

import { useEditStore } from "@/features/edit/store";
import { useSettings } from "@/features/settings/store";
import type { FormatSupportMap } from "@/features/spreadsheet/types";
import { useTracksStore } from "@/features/tracks/store";
import type { TrackRow } from "@/features/tracks/types";
import type { ColumnSettings } from "./useColumnSettings.js";
import { useColumnSettings } from "./useColumnSettings.js";
import type { DialogState } from "./useDialogState.js";
import { useDialogState } from "./useDialogState.js";
import { useFileOpen } from "./useFileOpen.js";
import { useFormatSupport } from "./useFormatSupport.js";
import { useGlobalShortcuts } from "./useGlobalShortcuts.js";
import type { GridHandlers } from "./useGridHandlers.js";
import { useGridHandlers } from "./useGridHandlers.js";
import type { SaveAllControls } from "./useSaveAll.js";
import { useSaveAll } from "./useSaveAll.js";
import type { TransientStatus } from "./useTransientStatus.js";
import { useTransientStatus } from "./useTransientStatus.js";

/** Public surface returned by {@link useAppShell}. */
export type AppShellModel = {
  /** Live, edit-applied rows (the spreadsheet's source of truth). */
  readonly rows: readonly TrackRow[];
  /** Whether the initial / open-files load is in flight. */
  readonly loading: boolean;
  /** Total dirty rows; used by the header and status bar. */
  readonly dirtyCount: number;
  /** Aggregated `Track.warnings` count across all rows. */
  readonly warningCount: number;
  /** Format support matrix (passed through for cell-disable decisions). */
  readonly support: FormatSupportMap;
  readonly columns: ColumnSettings;
  readonly dialogs: DialogState;
  readonly save: SaveAllControls;
  readonly grid: GridHandlers;
  readonly status: TransientStatus;
  /** Open Files handler (header button + Cmd/Ctrl+O). */
  readonly onOpenFiles: () => void;
};

/**
 * Composite hook that owns every store, side-effect, and callback the
 * AppShell renders against.
 *
 * The hook splits into seven cooperating sub-hooks (one per concern: format
 * support, transient status, column settings, dialogs, file open, save, grid
 * handlers) plus a global-shortcut binding. AppShell.tsx itself is reduced to
 * a JSX-only component that consumes this model.
 *
 * The `editStore.load` mirror effect (sync edit rows whenever the tracks
 * store finishes a load) lives here too — it's the only place that needs to
 * see both reducers, so extracting it would just push the dependency further.
 *
 * @returns The complete AppShell view model.
 */
export const useAppShell = (): AppShellModel => {
  const { state: tracksState, dispatch: tracksDispatch } = useTracksStore();
  const { state: editState, dispatch: editDispatch } = useEditStore();
  const [settings, setSettings] = useSettings();
  const support = useFormatSupport();
  const status = useTransientStatus();

  // Mirror the load result into the edit reducer so undo history resets when
  // the user opens a fresh batch of files.
  useEffect(() => {
    editDispatch({ type: "load", rows: tracksState.rows });
  }, [tracksState.rows, editDispatch]);

  const columns = useColumnSettings({ settings, setSettings, support });
  const dialogs = useDialogState({
    rows: editState.rows,
    editDispatch,
    support,
    notify: status.show,
  });
  const grid = useGridHandlers({
    editState,
    editDispatch,
    support,
    notify: status.show,
  });
  const save = useSaveAll({
    editState,
    editDispatch,
    tracksDispatch,
    notify: status.show,
  });
  const onOpenFiles = useFileOpen({
    tracksDispatch,
    recentFiles: settings.recentFiles,
    setSettings,
  });

  useGlobalShortcuts({ onOpenFiles, onSaveAll: save.saveAll, saveDisabled: save.saving });

  const dirtyCount = editState.rows.filter((row) => row.dirty).length;
  const warningCount = editState.rows.reduce((sum, row) => sum + row.track.warnings.length, 0);

  return {
    rows: editState.rows,
    loading: tracksState.loading,
    dirtyCount,
    warningCount,
    support,
    columns,
    dialogs,
    save,
    grid,
    status,
    onOpenFiles,
  };
};
