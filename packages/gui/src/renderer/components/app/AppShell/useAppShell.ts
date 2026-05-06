import type { FatalPayload } from "@mme/ipc";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDragAndDrop } from "@/features/dnd/useDragAndDrop";
import { useEditStore } from "@/features/edit/store";
import { useSettings } from "@/features/settings/store";
import { touchRecentFile } from "@/features/settings/touchRecentFile";
import { COLUMN_REGISTRY } from "@/features/spreadsheet/constants";
import type { ColumnDefinition, FormatSupportMap } from "@/features/spreadsheet/types";
import type { ResolvedTheme } from "@/features/theme/types";
import { useTheme } from "@/features/theme/useTheme";
import { loadTracks } from "@/features/tracks/loadTracks";
import { useTracksStore } from "@/features/tracks/store";
import type { TrackRow } from "@/features/tracks/types";
import type { ColumnSettings } from "./useColumnSettings.js";
import { useColumnSettings } from "./useColumnSettings.js";
import type { DialogState } from "./useDialogState.js";
import { useDialogState } from "./useDialogState.js";
import { useFatalHandler } from "./useFatalHandler.js";
import { useFileOpen } from "./useFileOpen.js";
import { useFormatSupport } from "./useFormatSupport.js";
import { useGlobalShortcuts } from "./useGlobalShortcuts.js";
import type { GridHandlers } from "./useGridHandlers.js";
import { useGridHandlers } from "./useGridHandlers.js";
import { useLogForwarder } from "./useLogForwarder.js";
import { useMenuActions } from "./useMenuActions.js";
import { useMenuStatePush } from "./useMenuStatePush.js";
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
  /** Resolved theme actually applied to the document (`light` / `dark`). */
  readonly theme: ResolvedTheme;
  /** `true` while the About dialog is mounted. */
  readonly aboutOpen: boolean;
  /** Hides the About dialog when `false`; passed to the modal. */
  readonly setAboutOpen: (open: boolean) => void;
  /** Latest fatal payload, or `null` when no fatal is pending. */
  readonly fatal: FatalPayload | null;
  /** Reload the renderer in response to a fatal. */
  readonly onReloadFromFatal: () => void;
  /** Quit the application in response to a fatal. */
  readonly onQuitFromFatal: () => void;
  /** Column visibility / width view model from `useColumnSettings`. */
  readonly columns: ColumnSettings;
  /** Pictures / Lyrics modal state from `useDialogState`. */
  readonly dialogs: DialogState;
  /** Save All / Discard Changes controls from `useSaveAll`. */
  readonly save: SaveAllControls;
  /** Grid commit / paste / undo callbacks from `useGridHandlers`. */
  readonly grid: GridHandlers;
  /** Transient status bar text from `useTransientStatus`. */
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
  const theme = useTheme();
  useLogForwarder();
  const [fatal, dismissFatal] = useFatalHandler();
  const [aboutOpen, setAboutOpen] = useState(false);

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

  const onCloseAll = useCallback(() => {
    tracksDispatch({ type: "clear" });
    editDispatch({ type: "load", rows: [] });
  }, [tracksDispatch, editDispatch]);

  const onSelectAll = useCallback(() => {
    // v1: selection model is not implemented yet — the Edit menu's Select All
    // is wired so the accelerator does not fall through to the OS, but it has
    // no spreadsheet-level effect.
  }, []);

  const onDropPaths = useCallback(
    async (paths: readonly string[]): Promise<void> => {
      if (paths.length === 0) {
        return;
      }

      tracksDispatch({ type: "load:start" });
      const result = await loadTracks(paths);
      tracksDispatch({
        type: "load:done",
        payload: { rows: result.rows, errors: result.errors },
      });

      if (result.rows.length > 0) {
        const next = touchRecentFile(
          settings.recentFiles,
          result.rows.map((row) => row.filePath),
        );
        setSettings({ recentFiles: next });
      }
    },
    [tracksDispatch, setSettings, settings.recentFiles],
  );

  useDragAndDrop({ onPaths: onDropPaths, disabled: tracksState.loading || save.saving });

  useMenuActions({
    onOpenFiles,
    onSaveAll: save.saveAll,
    onDiscardChanges: save.discardChanges,
    onCloseAll,
    onSelectAll,
    onShowAbout: () => setAboutOpen(true),
    onToggleColumn: columns.toggleColumn,
    visibleColumnIds: columns.visibleIds,
    themePreference: settings.theme,
    setSettings,
    tracksDispatch,
    editDispatch,
    recentFiles: settings.recentFiles,
  });

  const allColumns: readonly ColumnDefinition[] = useMemo(() => Object.values(COLUMN_REGISTRY), []);

  const dirtyCount = editState.rows.filter((row) => row.dirty).length;
  const warningCount = editState.rows.reduce((sum, row) => sum + row.track.warnings.length, 0);

  useMenuStatePush({
    hasDirty: dirtyCount > 0,
    recentFiles: settings.recentFiles,
    theme,
    visibleColumnIds: columns.visibleIds as readonly string[],
    allColumns,
  });

  return {
    rows: editState.rows,
    loading: tracksState.loading,
    dirtyCount,
    warningCount,
    support,
    theme,
    aboutOpen,
    setAboutOpen,
    fatal,
    onReloadFromFatal: () => {
      dismissFatal();
      window.location.reload();
    },
    onQuitFromFatal: () => {
      dismissFatal();
      window.close();
    },
    columns,
    dialogs,
    save,
    grid,
    status,
    onOpenFiles,
  };
};
