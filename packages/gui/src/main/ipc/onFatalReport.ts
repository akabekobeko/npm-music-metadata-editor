import type { FatalPayload } from "./types.js";

/**
 * Channel handler for `mme:fatal:report`.
 *
 * Renderer reports its own `window.onerror` / `unhandledrejection` here so
 * the Main-side log captures both halves of the application. Main does not
 * echo the report back — the Renderer already drew its modal locally.
 *
 * @param _ev - Electron event object (unused).
 * @param payload - Fatal payload from the Renderer.
 */
export const onFatalReport = (_ev: Electron.IpcMainEvent, payload: FatalPayload): void => {
  console.error(`[fatal:${payload.source}]`, payload.message, payload.stack ?? "");
};
