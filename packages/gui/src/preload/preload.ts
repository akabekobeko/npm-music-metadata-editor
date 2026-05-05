import { contextBridge, ipcRenderer } from "electron";
import type { MmeBridge } from "../shared/bridge.js";
import {
  type IpcChannel,
  type IpcRequestOf,
  type IpcResponseOf,
  PROGRESS_SAVE_CHANNEL,
  type ProgressSavePayload,
} from "../shared/ipc-contract.js";

/**
 * Typed wrapper around `ipcRenderer.invoke`.
 *
 * Re-asserts the response type because Electron's signature is `Promise<any>`.
 * Callers feed the channel name as a const literal so the request / response
 * types are pinned by {@link IpcContract}.
 *
 * @param channel - The IPC channel to invoke.
 * @param request - Channel-specific request payload (omitted when `void`).
 * @returns The response payload.
 */
const invoke = <C extends IpcChannel>(
  channel: C,
  request?: IpcRequestOf<C>,
): Promise<IpcResponseOf<C>> => ipcRenderer.invoke(channel, request) as Promise<IpcResponseOf<C>>;

/**
 * Build the bridge object exposed as `window.mme`.
 *
 * Plain helper so the preload can keep `contextBridge.exposeInMainWorld` to a
 * single statement. Each verb forwards to {@link invoke} with the channel name
 * baked in, which is what makes Renderer call sites read `window.mme.x.y(args)`
 * instead of `ipcRenderer.invoke("mme:x:y", args)`.
 *
 * @returns The bridge object.
 */
const buildBridge = (): MmeBridge => ({
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  app: {
    getVersions: () => invoke("mme:app:getVersions"),
  },
  dialog: {
    openFiles: (request) => invoke("mme:dialog:openFiles", request),
  },
  track: {
    load: (request) => invoke("mme:track:load", request),
    loadMany: (request) => invoke("mme:track:loadMany", request),
    save: (request) => invoke("mme:track:save", request),
  },
  formatSupport: {
    list: () => invoke("mme:formatSupport:list"),
  },
  settings: {
    get: () => invoke("mme:settings:get"),
    set: (request) => invoke("mme:settings:set", request),
  },
  progress: {
    onSave: (listener) => {
      const wrapped = (_event: unknown, payload: ProgressSavePayload): void => listener(payload);
      ipcRenderer.on(PROGRESS_SAVE_CHANNEL, wrapped);
      return () => ipcRenderer.off(PROGRESS_SAVE_CHANNEL, wrapped);
    },
  },
});

contextBridge.exposeInMainWorld("mme", buildBridge());
