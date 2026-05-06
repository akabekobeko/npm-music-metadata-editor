import { type Dispatch, useEffect } from "react";
import type { EditAction } from "@/features/edit/store";
import { touchRecentFile } from "@/features/settings/touchRecentFile";
import type { UpdateSettings } from "@/features/settings/types";
import type { ColumnId } from "@/features/spreadsheet/types";
import { loadTracks } from "@/features/tracks/loadTracks";
import type { TracksAction } from "@/features/tracks/store";
import type { MenuAction, MenuActionPayload } from "../../../../main/ipc/types.js";

/** Args for {@link useMenuActions}. */
type Args = {
  readonly onOpenFiles: () => void;
  readonly onSaveAll: () => void;
  readonly onDiscardChanges: () => void;
  readonly onCloseAll: () => void;
  readonly onSelectAll: () => void;
  readonly onShowAbout: () => void;
  readonly onToggleColumn: (id: ColumnId, visible: boolean) => void;
  readonly visibleColumnIds: readonly ColumnId[];
  readonly themePreference: "light" | "dark" | "system" | undefined;
  readonly setSettings: UpdateSettings;
  readonly tracksDispatch: Dispatch<TracksAction>;
  readonly editDispatch: Dispatch<EditAction>;
  readonly recentFiles: readonly string[];
};

/**
 * Subscribe to `mme:menu:action` and dispatch each payload to the matching
 * AppShell handler.
 *
 * The hook is the **only** place a `MenuAction` discriminant is decoded into
 * a renderer-side action — keeping the switch local lets future actions land
 * with a single edit instead of hunting through call sites.
 *
 * @param args - Every callback / state slice the action handlers need.
 */
export const useMenuActions = ({
  onOpenFiles,
  onSaveAll,
  onDiscardChanges,
  onCloseAll,
  onSelectAll,
  onShowAbout,
  onToggleColumn,
  visibleColumnIds,
  themePreference,
  setSettings,
  tracksDispatch,
  editDispatch,
  recentFiles,
}: Args): void => {
  useEffect(() => {
    const unsubscribe = window.mme.menu.onAction((payload) => {
      void dispatch(payload);
    });

    const dispatch = async (payload: MenuActionPayload): Promise<void> => {
      switch (payload.action satisfies MenuAction) {
        case "openFiles":
        case "saveSelected":
          // Save Selected falls back to Save All in v1 (no row-selection model yet).
          if (payload.action === "openFiles") {
            onOpenFiles();
          } else {
            onSaveAll();
          }
          return;
        case "saveAll":
          onSaveAll();
          return;
        case "discardChanges":
          onDiscardChanges();
          return;
        case "closeAll":
          onCloseAll();
          return;
        case "selectAll":
          onSelectAll();
          return;
        case "showAbout":
          onShowAbout();
          return;
        case "toggleTheme": {
          const next = themePreference === "dark" ? "light" : "dark";
          setSettings({ theme: next });
          return;
        }
        case "toggleColumn": {
          const id = payload.data;
          if (typeof id !== "string") {
            return;
          }

          const isVisible = visibleColumnIds.includes(id as ColumnId);
          onToggleColumn(id as ColumnId, !isVisible);
          return;
        }
        case "openRecent": {
          if (payload.data === null) {
            setSettings({ recentFiles: [] });
            return;
          }

          const filePath = typeof payload.data === "string" ? payload.data : null;
          if (filePath === null) {
            return;
          }

          tracksDispatch({ type: "load:start" });
          const result = await loadTracks([filePath]);
          tracksDispatch({
            type: "load:done",
            payload: { rows: result.rows, errors: result.errors },
          });
          editDispatch({ type: "load", rows: result.rows });

          if (result.rows.length > 0) {
            const next = touchRecentFile(
              recentFiles,
              result.rows.map((row) => row.filePath),
            );
            setSettings({ recentFiles: next });
          }
        }
      }
    };

    return () => unsubscribe();
  }, [
    onOpenFiles,
    onSaveAll,
    onDiscardChanges,
    onCloseAll,
    onSelectAll,
    onShowAbout,
    onToggleColumn,
    visibleColumnIds,
    themePreference,
    setSettings,
    tracksDispatch,
    editDispatch,
    recentFiles,
  ]);
};
