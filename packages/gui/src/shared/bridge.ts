import type {
  IpcChannel,
  IpcRequestOf,
  IpcResponseOf,
  PROGRESS_SAVE_CHANNEL,
  ProgressSavePayload,
} from "./ipc-contract.js";

/**
 * Build the function signature for one IPC verb on the bridge.
 *
 * The function takes the channel's request payload (or no argument when the
 * request type is `void`) and resolves to the channel's response payload.
 */
type BridgeFn<C extends IpcChannel> = [IpcRequestOf<C>] extends [undefined]
  ? () => Promise<IpcResponseOf<C>>
  : (request: IpcRequestOf<C>) => Promise<IpcResponseOf<C>>;

/**
 * Subscribe to {@link PROGRESS_SAVE_CHANNEL} (Main → Renderer one-way notifications).
 *
 * @returns Unsubscribe function. Calling it detaches the listener.
 */
export type ProgressSaveSubscriber = (
  listener: (payload: ProgressSavePayload) => void,
) => () => void;

/**
 * The shape of `window.mme`, exposed via `contextBridge.exposeInMainWorld`.
 *
 * Grouped by resource (`app` / `dialog` / `track` / ...) to keep call sites
 * readable: `window.mme.track.load({ filePath })` instead of a flat catalog of
 * channel names. The `versions` object is populated at preload time and exists
 * even before any IPC call has been made.
 */
export type MmeBridge = {
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
  readonly app: {
    readonly getVersions: BridgeFn<"mme:app:getVersions">;
  };
  readonly dialog: {
    readonly openFiles: BridgeFn<"mme:dialog:openFiles">;
  };
  readonly track: {
    readonly load: BridgeFn<"mme:track:load">;
    readonly loadMany: BridgeFn<"mme:track:loadMany">;
    readonly save: BridgeFn<"mme:track:save">;
  };
  readonly formatSupport: {
    readonly list: BridgeFn<"mme:formatSupport:list">;
  };
  readonly settings: {
    readonly get: BridgeFn<"mme:settings:get">;
    readonly set: BridgeFn<"mme:settings:set">;
  };
  readonly progress: {
    readonly onSave: ProgressSaveSubscriber;
  };
};
