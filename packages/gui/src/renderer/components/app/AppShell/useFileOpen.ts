import { type Dispatch, useCallback } from "react";

import { touchRecentFile } from "@/features/settings/touchRecentFile";
import type { UpdateSettings } from "@/features/settings/types";
import { loadTracks } from "@/features/tracks/loadTracks";
import type { TracksAction } from "@/features/tracks/store";

/** Args for {@link useFileOpen}. */
type Args = {
  /** Tracks reducer dispatch — drives load:start / load:done. */
  readonly tracksDispatch: Dispatch<TracksAction>;
  /** Current `recentFiles` list — passed into `touchRecentFile` to dedupe. */
  readonly recentFiles: readonly string[];
  /** Settings patch helper — used to write `recentFiles` back. */
  readonly setSettings: UpdateSettings;
};

/**
 * Build the open-files handler that drives the dialog → load → settings flow.
 *
 * Encapsulates three responsibilities the AppShell would otherwise inline:
 *   1. Open `mme:dialog:openFiles` and short-circuit on cancel / empty.
 *   2. Drive the tracks reducer through `load:start` → `load:done`.
 *   3. Promote the loaded paths into `AppSettings.recentFiles` via
 *      `touchRecentFile`, but **only** for paths that actually loaded so that
 *      a "Cancel" or every-row-failed open doesn't pollute the recent list.
 *
 * @param args - Tracks dispatch, current recent-files snapshot, settings patch helper.
 * @returns A `handleOpenFiles` callback for buttons / accelerators.
 */
export const useFileOpen = ({
  tracksDispatch,
  recentFiles,
  setSettings,
}: Args): (() => Promise<void>) =>
  useCallback(async () => {
    const dialog = await window.mme.dialog.openFiles({ multiple: true });
    if (!dialog.ok || dialog.value.length === 0) {
      return;
    }

    tracksDispatch({ type: "load:start" });
    const result = await loadTracks(dialog.value);
    tracksDispatch({ type: "load:done", payload: { rows: result.rows, errors: result.errors } });

    if (result.rows.length > 0) {
      const next = touchRecentFile(
        recentFiles,
        result.rows.map((row) => row.filePath),
      );
      setSettings({ recentFiles: next });
    }
  }, [tracksDispatch, recentFiles, setSettings]);
