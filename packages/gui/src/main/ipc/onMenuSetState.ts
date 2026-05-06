import { applyMenuStateSnapshot } from "../menu/menuController.js";
import type { MenuStateSnapshot } from "./types.js";

/**
 * Channel handler for `mme:menu:setState`.
 *
 * Renderer pushes the slice of state that affects menu enablement / labels
 * (`hasDirty`, `recentFiles`, `theme`, `columns`) and Main rebuilds the
 * application menu. Errors are swallowed because a stale menu is preferable
 * to surfacing an IPC failure for a cosmetic update.
 *
 * Implemented as a `void` channel: we use `ipcMain.on` instead of
 * `ipcMain.handle` so the Renderer can fire-and-forget without paying for an
 * acknowledgement.
 *
 * @param _ev - Electron event object (unused).
 * @param snapshot - Latest dynamic menu state from the Renderer.
 */
export const onMenuSetState = (_ev: Electron.IpcMainEvent, snapshot: MenuStateSnapshot): void => {
  try {
    applyMenuStateSnapshot(snapshot);
  } catch (error) {
    console.error("[mme:menu:setState]", error);
  }
};
