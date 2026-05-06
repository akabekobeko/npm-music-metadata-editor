import { contextBridge, ipcRenderer, webUtils } from "electron";
import { IpcKeys } from "../main/ipc/ipcKeys.js";
import type {
  FatalPayload,
  MenuActionPayload,
  MmeBridge,
  ProgressSavePayload,
} from "../main/ipc/types.js";

/**
 * Build the `window.mme` bridge.
 *
 * Each verb forwards to `ipcRenderer.invoke(IpcKeys.X, args)`. The Bridge type
 * lives in `main/ipc/types.ts` so that this file (Preload) and the Renderer's
 * `vite-env.d.ts` agree on the shape without sharing a runtime module.
 *
 * @returns The bridge object; assigned as the value of `window.mme`.
 */
const buildBridge = (): MmeBridge => ({
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  app: {
    getVersions: () => ipcRenderer.invoke(IpcKeys.GetVersions),
  },
  dialog: {
    openFiles: (request) => ipcRenderer.invoke(IpcKeys.ShowOpenFiles, request),
    saveFile: (request) => ipcRenderer.invoke(IpcKeys.ShowSaveFile, request),
  },
  track: {
    load: (request) => ipcRenderer.invoke(IpcKeys.LoadTrack, request),
    loadMany: (request) => ipcRenderer.invoke(IpcKeys.LoadMany, request),
    save: (request) => ipcRenderer.invoke(IpcKeys.SaveTrack, request),
  },
  file: {
    readBytes: (request) => ipcRenderer.invoke(IpcKeys.ReadBytes, request),
    writeBytes: (request) => ipcRenderer.invoke(IpcKeys.WriteBytes, request),
  },
  formatSupport: {
    list: () => ipcRenderer.invoke(IpcKeys.ListFormatSupport),
  },
  settings: {
    get: () => ipcRenderer.invoke(IpcKeys.GetSettings),
    set: (request) => ipcRenderer.invoke(IpcKeys.SetSettings, request),
  },
  progress: {
    onSave: (listener) => {
      const wrapped = (_event: unknown, payload: ProgressSavePayload): void => listener(payload);
      ipcRenderer.on(IpcKeys.ProgressSave, wrapped);
      return () => ipcRenderer.off(IpcKeys.ProgressSave, wrapped);
    },
  },
  dnd: {
    expandPaths: (request) => ipcRenderer.invoke(IpcKeys.ExpandPaths, request),
    pathFor: (file) => webUtils.getPathForFile(file),
  },
  menu: {
    onAction: (listener) => {
      const wrapped = (_event: unknown, payload: MenuActionPayload): void => listener(payload);
      ipcRenderer.on(IpcKeys.MenuAction, wrapped);
      return () => ipcRenderer.off(IpcKeys.MenuAction, wrapped);
    },
    setState: (snapshot) => ipcRenderer.send(IpcKeys.MenuSetState, snapshot),
  },
  fatal: {
    onError: (listener) => {
      const wrapped = (_event: unknown, payload: FatalPayload): void => listener(payload);
      ipcRenderer.on(IpcKeys.Fatal, wrapped);
      return () => ipcRenderer.off(IpcKeys.Fatal, wrapped);
    },
    report: (payload) => {
      ipcRenderer.send(IpcKeys.FatalReport, payload);
    },
  },
  log: {
    forward: (request) => ipcRenderer.send(IpcKeys.LogForward, request),
  },
});

contextBridge.exposeInMainWorld("mme", buildBridge());
