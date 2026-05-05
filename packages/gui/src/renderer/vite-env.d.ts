/// <reference types="vite/client" />

import type { MmeBridge } from "../main/ipc/types";

declare global {
  interface Window {
    /**
     * Bridge to the Main process exposed by the preload script.
     *
     * The value is supplied at runtime via `contextBridge.exposeInMainWorld`;
     * the type is sourced from `main/ipc/types.ts` so Renderer can stay
     * decoupled from `@akabeko/music-metadata-editor` and from `electron`.
     */
    readonly mme: MmeBridge;
  }
}
