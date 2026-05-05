import { useCallback, useEffect, useMemo, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { buildColumns } from "@/features/spreadsheet/buildColumns";
import { DEFAULT_VISIBLE_IDS } from "@/features/spreadsheet/constants";
import type { FormatSupportMap } from "@/features/spreadsheet/types";
import { loadTracks } from "@/features/tracks/loadTracks";
import { useTracksStore } from "@/features/tracks/store";
import type { TrackRow } from "@/features/tracks/types";

import { EmptyState } from "./EmptyState";
import { Header } from "./Header";
import { Spreadsheet } from "./Spreadsheet/Spreadsheet";

/**
 * Top-level shell composing the header, the spreadsheet (or empty state),
 * the tracks store, and the format-support snapshot.
 *
 * The shell owns the user-facing async flows (open dialog → IPC → store
 * dispatch) so individual components can stay declarative. Format support is
 * fetched once at mount; the matrix is static for the lifetime of the
 * renderer process.
 *
 * @returns The composed application UI.
 */
export function AppShell() {
  const { state, dispatch } = useTracksStore();
  const support = useFormatSupport();
  const columns = useMemo(() => buildColumns(DEFAULT_VISIBLE_IDS, support), [support]);

  const handleOpenFiles = useCallback(async () => {
    const dialog = await window.mme.dialog.openFiles({ multiple: true });
    if (!dialog.ok || dialog.value.length === 0) {
      return;
    }

    dispatch({ type: "load:start" });
    const result = await loadTracks(dialog.value);
    dispatch({ type: "load:done", payload: { rows: result.rows, errors: result.errors } });
  }, [dispatch]);

  useOpenFilesShortcut(handleOpenFiles);

  const handleOpenPictures = useCallback((row: TrackRow) => {
    notifyPhase5(`Pictures editor for "${row.filePath}"`);
  }, []);

  const handleOpenLyrics = useCallback((row: TrackRow) => {
    notifyPhase5(`Lyrics editor for "${row.filePath}"`);
  }, []);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        <Header
          fileCount={state.rows.length}
          loading={state.loading}
          onOpenFiles={handleOpenFiles}
        />
        <main className="flex-1 overflow-hidden">
          {state.rows.length === 0 ? (
            <EmptyState onOpenFiles={handleOpenFiles} />
          ) : (
            <Spreadsheet
              columns={columns}
              rows={state.rows}
              support={support}
              onOpenPictures={handleOpenPictures}
              onOpenLyrics={handleOpenLyrics}
            />
          )}
        </main>
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
