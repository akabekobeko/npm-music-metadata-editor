/// <reference types="vite/client" />

interface Window {
  /**
   * Bridge to the Main process exposed by the preload script.
   *
   * The value is supplied at runtime via `contextBridge.exposeInMainWorld`;
   * the type is sourced from `main/ipc/types.ts` so Renderer can stay
   * decoupled from `@akabeko/music-metadata-editor` and from `electron`.
   */
  readonly mme: import("../main/ipc/types").MmeBridge;
}

/**
 * Virtual module that re-exports every IPC contract type the renderer needs.
 *
 * Renderer code imports these via `import type { ... } from "@mme/ipc"`
 * instead of reaching into `../../../main/ipc/types`, so the cross-process
 * dependency on `src/main` is centralised in this declaration file.
 *
 * Type-only — `import type` is erased before Vite / the bundler runs, so no
 * real `@mme/ipc` module exists at runtime.
 */
declare module "@mme/ipc" {
  export * from "../main/ipc/types";
}
