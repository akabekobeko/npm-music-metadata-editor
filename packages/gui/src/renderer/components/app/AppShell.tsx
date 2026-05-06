import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { expandColumnPaste } from "@/features/edit/expandColumnPaste";
import { applyPaste, parseClipboardText } from "@/features/edit/paste";
import { useEditStore } from "@/features/edit/store";
import { saveDirtyRows } from "@/features/save/saveDirtyRows";
import type { SaveProgress, SaveResult } from "@/features/save/types";
import { resolveColumnWidths } from "@/features/settings/resolveColumnWidths";
import { useSettings } from "@/features/settings/store";
import { touchRecentFile } from "@/features/settings/touchRecentFile";
import { buildColumns } from "@/features/spreadsheet/buildColumns";
import type { ColumnId, FormatSupportMap } from "@/features/spreadsheet/types";
import { loadTracks } from "@/features/tracks/loadTracks";
import { useTracksStore } from "@/features/tracks/store";
import type { TrackRow } from "@/features/tracks/types";
import type { LyricsInfo, PictureInfo } from "../../../main/ipc/types";

import { EmptyState } from "./EmptyState";
import { Header } from "./Header";
import { LyricsDialog } from "./LyricsDialog/LyricsDialog";
import { PicturesDialog } from "./PicturesDialog/PicturesDialog";
import { SavingDialog } from "./SavingDialog";
import { type CommitArgs, type PasteArgs, Spreadsheet } from "./Spreadsheet/Spreadsheet";
import { StatusBar } from "./StatusBar";

/** Modal currently mounted on top of the spreadsheet. */
type ActiveDialog =
  | { readonly kind: "pictures"; readonly filePath: string }
  | { readonly kind: "lyrics"; readonly filePath: string }
  | null;

/** Milliseconds the transient status text stays visible. */
const TRANSIENT_STATUS_MS = 5000;

/**
 * Top-level shell composing the header, the spreadsheet (or empty state),
 * the status bar, and the load / edit / settings stores.
 *
 * Settings flow (Phase 6): `useSettings` hands back the persisted snapshot
 * and a `setSettings` patch helper. The shell projects `columns.visibleIds`
 * and `columns.widths` into the spreadsheet, listens for column toggles /
 * resizes, and pushes `recentFiles` updates after every successful open.
 *
 * Save flow (Phase 6): `Save All` collects every `dirty` row and runs them
 * through `saveDirtyRows` while the {@link SavingDialog} masks the rest of
 * the UI. After the loop terminates we re-load the affected paths so the
 * `Track` snapshots and `warnings` columns refresh in place.
 *
 * @returns The composed application UI.
 */
export function AppShell() {
  const { state: tracksState, dispatch: tracksDispatch } = useTracksStore();
  const { state: editState, dispatch: editDispatch } = useEditStore();
  const support = useFormatSupport();
  const [settings, setSettings] = useSettings();
  const visibleIds = settings.columns.visibleIds as readonly ColumnId[];
  const columns = useMemo(() => buildColumns(visibleIds, support), [visibleIds, support]);
  const columnWidths = useMemo(
    () => resolveColumnWidths(columns, settings.columns.widths),
    [columns, settings.columns.widths],
  );

  useEffect(() => {
    editDispatch({ type: "load", rows: tracksState.rows });
  }, [tracksState.rows, editDispatch]);

  const handleOpenFiles = useCallback(async () => {
    const dialog = await window.mme.dialog.openFiles({ multiple: true });
    if (!dialog.ok || dialog.value.length === 0) {
      return;
    }

    tracksDispatch({ type: "load:start" });
    const result = await loadTracks(dialog.value);
    tracksDispatch({ type: "load:done", payload: { rows: result.rows, errors: result.errors } });

    if (result.rows.length > 0) {
      const next = touchRecentFile(
        settings.recentFiles,
        result.rows.map((row) => row.filePath),
      );
      setSettings({ recentFiles: next });
    }
  }, [tracksDispatch, settings.recentFiles, setSettings]);

  useOpenFilesShortcut(handleOpenFiles);

  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const [transientStatus, setTransientStatus] = useState<string | null>(null);
  const transientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTransientStatus = useCallback((message: string): void => {
    setTransientStatus(message);
    if (transientTimer.current !== null) {
      clearTimeout(transientTimer.current);
    }

    transientTimer.current = setTimeout(() => setTransientStatus(null), TRANSIENT_STATUS_MS);
  }, []);

  const handleOpenPictures = useCallback(
    (row: TrackRow): void => {
      const entry = support.get(row.track.audioFormat);
      if (entry !== undefined && !entry.supportsPictures) {
        showTransientStatus(`${row.track.audioFormat.toUpperCase()} does not support pictures.`);
        return;
      }

      setActiveDialog({ kind: "pictures", filePath: row.filePath });
    },
    [support, showTransientStatus],
  );

  const handleOpenLyrics = useCallback(
    (row: TrackRow): void => {
      const entry = support.get(row.track.audioFormat);
      if (entry !== undefined && !entry.supportsLyrics) {
        showTransientStatus(`${row.track.audioFormat.toUpperCase()} does not support lyrics.`);
        return;
      }

      setActiveDialog({ kind: "lyrics", filePath: row.filePath });
    },
    [support, showTransientStatus],
  );

  const closeActiveDialog = useCallback((): void => {
    setActiveDialog(null);
  }, []);

  const handleApplyPictures = useCallback(
    (pictures: readonly PictureInfo[]): void => {
      if (activeDialog?.kind !== "pictures") {
        return;
      }

      editDispatch({ type: "commitPictures", filePath: activeDialog.filePath, pictures });
      setActiveDialog(null);
    },
    [activeDialog, editDispatch],
  );

  const handleApplyLyrics = useCallback(
    (lyrics: LyricsInfo | undefined): void => {
      if (activeDialog?.kind !== "lyrics") {
        return;
      }

      editDispatch({ type: "commitLyrics", filePath: activeDialog.filePath, lyrics });
      setActiveDialog(null);
    },
    [activeDialog, editDispatch],
  );

  const activeRow =
    activeDialog === null
      ? null
      : (editState.rows.find((row) => row.filePath === activeDialog.filePath) ?? null);

  useEffect(
    () => () => {
      if (transientTimer.current !== null) {
        clearTimeout(transientTimer.current);
      }
    },
    [],
  );

  const handleCommit = useCallback(
    ({ row, field, value }: CommitArgs): void => {
      editDispatch({ type: "commit", filePath: row.filePath, field, value });
    },
    [editDispatch],
  );

  const handleUndo = useCallback((): void => {
    editDispatch({ type: "undo" });
  }, [editDispatch]);

  const handlePaste = useCallback(
    ({ columnId, clipboardText, baseRowIndex, maxRows, mode }: PasteArgs): void => {
      const parsed = parseClipboardText(clipboardText).slice(0, maxRows);
      if (parsed.length === 0) {
        return;
      }

      const totalRows = editState.rows.length - baseRowIndex;
      const values = expandColumnPaste({ values: parsed, mode, totalRows });
      const slice = editState.rows.slice(baseRowIndex, baseRowIndex + values.length);
      const outcome = applyPaste({ rows: slice, columnId, values, support });
      const nextRows: readonly TrackRow[] = [
        ...editState.rows.slice(0, baseRowIndex),
        ...outcome.nextRows,
        ...editState.rows.slice(baseRowIndex + values.length),
      ];
      editDispatch({ type: "applyChange", nextRows });
      showTransientStatus(formatPasteSummary(outcome));
    },
    [editState.rows, editDispatch, support, showTransientStatus],
  );

  const handleToggleColumn = useCallback(
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

  const handleColumnResize = useCallback(
    (id: ColumnId, width: number): void => {
      setSettings({ columns: { widths: { [id]: width } } });
    },
    [setSettings],
  );

  const handleDiscardChanges = useCallback((): void => {
    const dirtyPaths = editState.rows.filter((row) => row.dirty).map((row) => row.filePath);
    for (const filePath of dirtyPaths) {
      editDispatch({ type: "revert", filePath });
    }
  }, [editState.rows, editDispatch]);

  const cancelRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgress | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const handleSaveAll = useCallback(async (): Promise<void> => {
    const dirtyRows = editState.rows.filter((row) => row.dirty);
    if (dirtyRows.length === 0) {
      return;
    }

    cancelRef.current = false;
    setErrorCount(0);
    setSaveProgress(null);
    setSaving(true);

    let runningErrorCount = 0;
    const summary = await saveDirtyRows({
      rows: dirtyRows,
      isCancelled: () => cancelRef.current,
      onProgress: (progress) => {
        setSaveProgress(progress);
      },
    });

    runningErrorCount = summary.results.filter((r) => r.error !== undefined).length;
    setErrorCount(runningErrorCount);

    const errorMap = new Map(summary.results.map((r) => [r.filePath, r.error]));
    editDispatch({ type: "markSaveErrors", errors: errorMap });

    const succeededPaths = summary.results
      .filter((r) => r.error === undefined)
      .map((r) => r.filePath);

    if (succeededPaths.length > 0) {
      const reload = await loadTracks(succeededPaths);
      tracksDispatch({
        type: "load:done",
        payload: { rows: reload.rows, errors: reload.errors },
      });
    }

    setSaving(false);
    showTransientStatus(formatSaveSummary(summary.results, summary.cancelled));
  }, [editState.rows, editDispatch, tracksDispatch, showTransientStatus]);

  const handleCancelSave = useCallback((): void => {
    cancelRef.current = true;
  }, []);

  const dirtyCount = editState.rows.filter((row) => row.dirty).length;
  const warningCount = editState.rows.reduce((sum, row) => sum + row.track.warnings.length, 0);

  useSaveAllShortcut(handleSaveAll, saving);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        <Header
          fileCount={editState.rows.length}
          dirtyCount={dirtyCount}
          loading={tracksState.loading}
          saving={saving}
          visibleIds={visibleIds}
          onOpenFiles={handleOpenFiles}
          onToggleColumn={handleToggleColumn}
          onSaveAll={handleSaveAll}
          onDiscardChanges={handleDiscardChanges}
        />
        <main className="flex-1 overflow-hidden">
          {editState.rows.length === 0 ? (
            <EmptyState onOpenFiles={handleOpenFiles} />
          ) : (
            <Spreadsheet
              columns={columns}
              rows={editState.rows}
              support={support}
              columnWidths={columnWidths}
              onOpenPictures={handleOpenPictures}
              onOpenLyrics={handleOpenLyrics}
              onCommit={handleCommit}
              onPaste={handlePaste}
              onUndo={handleUndo}
              onColumnResize={handleColumnResize}
            />
          )}
        </main>
        <StatusBar
          fileCount={editState.rows.length}
          dirtyCount={dirtyCount}
          warningCount={warningCount}
          transient={transientStatus}
        />
      </div>
      {activeDialog?.kind === "pictures" && activeRow !== null ? (
        <PicturesDialog
          filePath={activeRow.filePath}
          initialPictures={activeRow.track.pictures}
          onApply={handleApplyPictures}
          onClose={closeActiveDialog}
          onNotify={showTransientStatus}
        />
      ) : null}
      {activeDialog?.kind === "lyrics" && activeRow !== null ? (
        <LyricsDialog
          filePath={activeRow.filePath}
          initialLyrics={activeRow.track.lyrics}
          onApply={handleApplyLyrics}
          onClose={closeActiveDialog}
          onNotify={showTransientStatus}
        />
      ) : null}
      <SavingDialog
        open={saving}
        progress={saveProgress}
        errorCount={errorCount}
        onCancel={handleCancelSave}
      />
    </TooltipProvider>
  );
}

/**
 * Fetch and cache the format support matrix for the lifetime of the renderer.
 *
 * Returns an empty map until the IPC round-trip resolves so consumers can
 * still render (every cell falls back to "not writable" before the matrix
 * arrives, which matches the disabled-cell story).
 *
 * @returns The format support matrix keyed by audio format.
 */
const useFormatSupport = (): FormatSupportMap => {
  const [support, setSupport] = useState<FormatSupportMap>(() => new Map());
  useEffect(() => {
    let cancelled = false;
    void window.mme.formatSupport.list().then((response) => {
      if (cancelled || !response.ok) {
        return;
      }

      const next = new Map(response.value.map((entry) => [entry.format, entry]));
      setSupport(next);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return support;
};

/**
 * Wire `Cmd/Ctrl+O` to the open-files handler at the document level.
 *
 * Listening at the document is enough because Electron's renderer has a
 * single window; native menu accelerators will replace this in a later phase.
 *
 * @param onOpen - Callback invoked when the shortcut fires.
 */
const useOpenFilesShortcut = (onOpen: () => void): void => {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const usingMeta = event.metaKey || event.ctrlKey;
      if (usingMeta && event.key.toLowerCase() === "o") {
        event.preventDefault();
        onOpen();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpen]);
};

/**
 * Wire `Cmd/Ctrl+S` to the Save All handler at the document level.
 *
 * Suppressed while a save is already in flight so the user does not
 * accidentally queue a second pass over the same dirty rows.
 *
 * @param onSave - Save All callback.
 * @param disabled - Whether the shortcut should currently be a no-op.
 */
const useSaveAllShortcut = (onSave: () => void, disabled: boolean): void => {
  useEffect(() => {
    if (disabled) {
      return;
    }

    const handler = (event: KeyboardEvent): void => {
      const usingMeta = event.metaKey || event.ctrlKey;
      if (usingMeta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onSave();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onSave, disabled]);
};

/**
 * Build the transient status sentence shown after a paste.
 *
 * @param outcome - Counters produced by `applyPaste`.
 * @returns A single-sentence summary of the paste action.
 */
const formatPasteSummary = (outcome: {
  readonly applied: number;
  readonly skippedUnsupported: number;
  readonly skippedInvalid: number;
}): string =>
  `Pasted ${outcome.applied} values, skipped ${outcome.skippedUnsupported} unsupported, ${outcome.skippedInvalid} invalid`;

/**
 * Build the transient status sentence shown after a Save All run terminates.
 *
 * @param results - Per-row outcomes from `saveDirtyRows`.
 * @param cancelled - Whether the loop bailed before reaching every row.
 * @returns A single-sentence summary, e.g. "Saved 4 of 5 (1 error)".
 */
const formatSaveSummary = (results: readonly SaveResult[], cancelled: boolean): string => {
  const total = results.length;
  const errors = results.filter((r) => r.error !== undefined).length;
  const ok = total - errors;
  const errorPart = errors === 0 ? "" : ` (${errors} ${errors === 1 ? "error" : "errors"})`;
  const cancelledPart = cancelled ? " — cancelled" : "";
  return `Saved ${ok} of ${total}${errorPart}${cancelledPart}`;
};
