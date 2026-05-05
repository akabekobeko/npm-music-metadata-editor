import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { expandColumnPaste } from "@/features/edit/expandColumnPaste";
import { applyPaste, parseClipboardText } from "@/features/edit/paste";
import { useEditStore } from "@/features/edit/store";
import { buildColumns } from "@/features/spreadsheet/buildColumns";
import { DEFAULT_VISIBLE_IDS } from "@/features/spreadsheet/constants";
import type { FormatSupportMap } from "@/features/spreadsheet/types";
import { loadTracks } from "@/features/tracks/loadTracks";
import { useTracksStore } from "@/features/tracks/store";
import type { TrackRow } from "@/features/tracks/types";

import { EmptyState } from "./EmptyState";
import { Header } from "./Header";
import { type CommitArgs, type PasteArgs, Spreadsheet } from "./Spreadsheet/Spreadsheet";
import { StatusBar } from "./StatusBar";

/** Milliseconds the transient status text stays visible. */
const TRANSIENT_STATUS_MS = 5000;

/**
 * Top-level shell composing the header, the spreadsheet (or empty state),
 * the status bar, and the load / edit stores.
 *
 * Two stores cooperate: `tracksStore` owns the IPC-driven load lifecycle
 * (loading flag, per-file errors), while `editStore` owns the live row array
 * plus undo history. Whenever the loaded rows change, `editStore.load`
 * mirrors them in — which also clears history because path identities may
 * have shifted.
 *
 * @returns The composed application UI.
 */
export function AppShell() {
  const { state: tracksState, dispatch: tracksDispatch } = useTracksStore();
  const { state: editState, dispatch: editDispatch } = useEditStore();
  const support = useFormatSupport();
  const columns = useMemo(() => buildColumns(DEFAULT_VISIBLE_IDS, support), [support]);

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
  }, [tracksDispatch]);

  useOpenFilesShortcut(handleOpenFiles);

  const handleOpenPictures = useCallback((row: TrackRow) => {
    notifyPhase5(`Pictures editor for "${row.filePath}"`);
  }, []);

  const handleOpenLyrics = useCallback((row: TrackRow) => {
    notifyPhase5(`Lyrics editor for "${row.filePath}"`);
  }, []);

  const [transientStatus, setTransientStatus] = useState<string | null>(null);
  const transientTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTransientStatus = useCallback((message: string): void => {
    setTransientStatus(message);
    if (transientTimer.current !== null) {
      clearTimeout(transientTimer.current);
    }

    transientTimer.current = setTimeout(() => setTransientStatus(null), TRANSIENT_STATUS_MS);
  }, []);

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

  const dirtyCount = editState.rows.filter((row) => row.dirty).length;
  const warningCount = editState.rows.reduce((sum, row) => sum + row.track.warnings.length, 0);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        <Header
          fileCount={editState.rows.length}
          loading={tracksState.loading}
          onOpenFiles={handleOpenFiles}
        />
        <main className="flex-1 overflow-hidden">
          {editState.rows.length === 0 ? (
            <EmptyState onOpenFiles={handleOpenFiles} />
          ) : (
            <Spreadsheet
              columns={columns}
              rows={editState.rows}
              support={support}
              onOpenPictures={handleOpenPictures}
              onOpenLyrics={handleOpenLyrics}
              onCommit={handleCommit}
              onPaste={handlePaste}
              onUndo={handleUndo}
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
 * Show a placeholder notice for the Phase 5 modal flows.
 *
 * Keeps the UI wiring exercised end-to-end (cell → handler → user) while
 * leaving the actual editor implementation to a later phase.
 *
 * @param subject - The subject describing what would have opened.
 */
const notifyPhase5 = (subject: string): void => {
  // Replaced with a real modal in Phase 5; alert is acceptable per the plan.
  globalThis.alert?.(`${subject} will open in Phase 5.`);
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
