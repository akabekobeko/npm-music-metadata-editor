import { ipcMain } from "electron";
import { IpcKeys } from "./ipcKeys.js";
import { onGetSettings } from "./onGetSettings.js";
import { onGetVersions } from "./onGetVersions.js";
import { onListFormatSupport } from "./onListFormatSupport.js";
import { onLoadMany } from "./onLoadMany.js";
import { onLoadTrack } from "./onLoadTrack.js";
import { onReadBytes } from "./onReadBytes.js";
import { onSaveTrack } from "./onSaveTrack.js";
import { onSetSettings } from "./onSetSettings.js";
import { onShowOpenFiles } from "./onShowOpenFiles.js";
import { onShowSaveFile } from "./onShowSaveFile.js";
import { onWriteBytes } from "./onWriteBytes.js";

/**
 * Tracks whether {@link initializeIpcEvents} has already wired the handlers.
 *
 * Guard against double registration when the function is called more than
 * once during app startup (e.g. in tests that re-create the main process).
 */
let isInitialized = false;

/**
 * Wire every {@link IpcKeys} channel up to its handler.
 *
 * Idempotent: a second call after a successful initialisation is a no-op so
 * the function is safe to invoke from multiple lifecycle hooks (`whenReady`,
 * `activate`, ...).
 *
 * @returns void.
 */
export const initializeIpcEvents = (): void => {
  if (isInitialized) {
    return;
  }

  isInitialized = true;
  ipcMain.handle(IpcKeys.GetVersions, onGetVersions);
  ipcMain.handle(IpcKeys.ShowOpenFiles, onShowOpenFiles);
  ipcMain.handle(IpcKeys.ShowSaveFile, onShowSaveFile);
  ipcMain.handle(IpcKeys.LoadTrack, onLoadTrack);
  ipcMain.handle(IpcKeys.LoadMany, onLoadMany);
  ipcMain.handle(IpcKeys.SaveTrack, onSaveTrack);
  ipcMain.handle(IpcKeys.ReadBytes, onReadBytes);
  ipcMain.handle(IpcKeys.WriteBytes, onWriteBytes);
  ipcMain.handle(IpcKeys.ListFormatSupport, onListFormatSupport);
  ipcMain.handle(IpcKeys.GetSettings, onGetSettings);
  ipcMain.handle(IpcKeys.SetSettings, onSetSettings);
};

/**
 * Detach every handler registered by {@link initializeIpcEvents}.
 *
 * Mirror of the reference implementation's `releaseIpcEvents`. Useful for
 * shutdown paths and for tests that need a clean slate between cases.
 *
 * @returns void.
 */
export const releaseIpcEvents = (): void => {
  if (!isInitialized) {
    return;
  }

  ipcMain.removeHandler(IpcKeys.GetVersions);
  ipcMain.removeHandler(IpcKeys.ShowOpenFiles);
  ipcMain.removeHandler(IpcKeys.ShowSaveFile);
  ipcMain.removeHandler(IpcKeys.LoadTrack);
  ipcMain.removeHandler(IpcKeys.LoadMany);
  ipcMain.removeHandler(IpcKeys.SaveTrack);
  ipcMain.removeHandler(IpcKeys.ReadBytes);
  ipcMain.removeHandler(IpcKeys.WriteBytes);
  ipcMain.removeHandler(IpcKeys.ListFormatSupport);
  ipcMain.removeHandler(IpcKeys.GetSettings);
  ipcMain.removeHandler(IpcKeys.SetSettings);
  isInitialized = false;
};
