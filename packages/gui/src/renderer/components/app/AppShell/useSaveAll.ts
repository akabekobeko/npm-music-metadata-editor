import { type Dispatch, useCallback, useRef, useState } from "react";

import type { EditAction, EditState } from "@/features/edit/store";
import { saveDirtyRows } from "@/features/save/saveDirtyRows";
import type { SaveProgress } from "@/features/save/types";
import { loadTracks } from "@/features/tracks/loadTracks";
import type { TracksAction } from "@/features/tracks/store";

import { formatSaveSummary } from "./formatSaveSummary.js";

/** Args for {@link useSaveAll}. */
type Args = {
  /** Current edit-store state — supplies the dirty rows to save. */
  readonly editState: EditState;
  /** Edit reducer dispatch — drives `markSaveErrors` / `revert`. */
  readonly editDispatch: Dispatch<EditAction>;
  /** Tracks reducer dispatch — used to refresh successful rows after save. */
  readonly tracksDispatch: Dispatch<TracksAction>;
  /** Notification sink for the post-save summary toast. */
  readonly notify: (message: string) => void;
};

/** Public surface returned by {@link useSaveAll}. */
export type SaveAllControls = {
  /** Whether a Save All run is currently in progress. */
  readonly saving: boolean;
  /** Latest progress event from the in-flight loop. */
  readonly progress: SaveProgress | null;
  /** Cumulative number of failed rows in this run. */
  readonly errorCount: number;
  /** Run Save All over the currently-dirty rows. */
  readonly saveAll: () => Promise<void>;
  /** Flip the cancel flag so the loop bails before the next row. */
  readonly cancelSave: () => void;
  /** Revert every dirty row to its load-time origin. */
  readonly discardChanges: () => void;
};

/**
 * Drive the Save All flow plus its sibling Discard Changes action.
 *
 * Owns the modal state (`saving` / `progress` / `errorCount`) that the
 * SavingDialog reads, plus the cancel ref that lets `cancelSave` bail the
 * loop without interrupting the current row's IPC. After the loop terminates
 * we mark per-row save errors on the edit reducer and re-load the succeeded
 * paths so `Track` snapshots and `warnings` columns refresh in place.
 *
 * Discard Changes lives in the same hook because it shares the dirty-row
 * predicate; bundling them keeps the AppShell wiring symmetrical.
 *
 * @param args - Edit / tracks store handles plus the notify sink.
 * @returns The save controls.
 */
export const useSaveAll = ({
  editState,
  editDispatch,
  tracksDispatch,
  notify,
}: Args): SaveAllControls => {
  const cancelRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<SaveProgress | null>(null);
  const [errorCount, setErrorCount] = useState(0);

  const saveAll = useCallback(async (): Promise<void> => {
    const dirtyRows = editState.rows.filter((row) => row.dirty);
    if (dirtyRows.length === 0) {
      return;
    }

    cancelRef.current = false;
    setErrorCount(0);
    setProgress(null);
    setSaving(true);

    const summary = await saveDirtyRows({
      rows: dirtyRows,
      isCancelled: () => cancelRef.current,
      onProgress: setProgress,
    });

    const errors = summary.results.filter((r) => r.error !== undefined).length;
    setErrorCount(errors);

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
    notify(formatSaveSummary(summary.results, summary.cancelled));
  }, [editState.rows, editDispatch, tracksDispatch, notify]);

  const cancelSave = useCallback((): void => {
    cancelRef.current = true;
  }, []);

  const discardChanges = useCallback((): void => {
    const dirtyPaths = editState.rows.filter((row) => row.dirty).map((row) => row.filePath);
    for (const filePath of dirtyPaths) {
      editDispatch({ type: "revert", filePath });
    }
  }, [editState.rows, editDispatch]);

  return { saving, progress, errorCount, saveAll, cancelSave, discardChanges };
};
