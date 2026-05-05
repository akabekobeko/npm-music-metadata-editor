/**
 * Type of the bridge object exposed via `contextBridge.exposeInMainWorld("mme", ...)`.
 * Phase 1 only exposes runtime versions; IPC APIs are added from Phase 2 onward.
 */
export type MmeBridge = {
  readonly versions: {
    readonly node: string;
    readonly chrome: string;
    readonly electron: string;
  };
};
