import { type BrowserWindow, dialog, type IpcMain } from "electron";
import type { IpcChannel, IpcRequestOf, IpcResponseOf } from "../../shared/ipc-contract.js";
import { handleGetVersions } from "./app/handleGetVersions.js";
import { createOpenFilesHandler } from "./dialog/handleOpenFiles.js";
import { handleFormatSupportList } from "./formatSupport/handleList.js";
import { handleSettingsGet, handleSettingsSet } from "./settings/handleSettings.js";
import { handleLoadMany } from "./track/handleLoadMany.js";
import { handleLoadTrack } from "./track/handleLoadTrack.js";
import { handleSaveTrack } from "./track/handleSaveTrack.js";

/**
 * Concrete handler signature for one IPC channel.
 *
 * Bound to the channel name so each handler entry in {@link IpcHandlerMap}
 * is type-checked against the contract; mismatches surface at the assignment
 * below rather than at runtime.
 */
type Handler<C extends IpcChannel> = (request: IpcRequestOf<C>) => Promise<IpcResponseOf<C>>;

/**
 * Exhaustive map from channel name to handler.
 *
 * `IpcChannel` is a discriminated union, so any missing key here is a type
 * error — which is the whole point of the map (instead of a loose `Object.keys`
 * loop): adding a channel to {@link IpcContract} forces the maintainer to wire
 * its handler too.
 */
type IpcHandlerMap = { readonly [C in IpcChannel]: Handler<C> };

/** Arguments for {@link registerIpcHandlers}. */
type Args = {
  /** The Electron `ipcMain` instance to register on. */
  ipcMain: IpcMain;
  /**
   * Lookup of the focused window. Forwarded to dialog handlers so modal
   * dialogs attach to the right parent window.
   */
  getFocusedWindow: () => BrowserWindow | null;
};

/**
 * Wire every {@link IpcContract} channel up to its handler.
 *
 * Idempotent in the sense that callers should only invoke it once at app
 * startup; calling it twice would attempt to register duplicate channels and
 * throw. The function returns nothing — the side effect is the `ipcMain.handle`
 * registrations.
 *
 * @returns void.
 */
export const registerIpcHandlers = ({ ipcMain, getFocusedWindow }: Args): void => {
  const handlers: IpcHandlerMap = {
    "mme:app:getVersions": handleGetVersions,
    "mme:dialog:openFiles": createOpenFilesHandler({
      showOpenDialog: dialog.showOpenDialog,
      getFocusedWindow,
    }),
    "mme:track:load": handleLoadTrack,
    "mme:track:loadMany": handleLoadMany,
    "mme:track:save": handleSaveTrack,
    "mme:formatSupport:list": handleFormatSupportList,
    "mme:settings:get": handleSettingsGet,
    "mme:settings:set": handleSettingsSet,
  };

  // Register each handler. Cast through `unknown` because TypeScript cannot
  // narrow the generic parameter inside `Object.entries` — the `IpcHandlerMap`
  // type already proved the entries are well-formed.
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, async (_event, request) =>
      (handler as (req: unknown) => Promise<unknown>)(request),
    );
  }
};
