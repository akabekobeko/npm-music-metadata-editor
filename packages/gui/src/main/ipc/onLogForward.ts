import type { LogForwardRequest } from "./types.js";

/**
 * Channel handler for `mme:log:forward`.
 *
 * Forwarded messages from the Renderer (its `console.error` is patched to
 * call this) land in Main's stdout/stderr so `electron-log` (or whatever
 * stdout transport is configured) records them in the same file as native
 * Main-side logs.
 *
 * Implemented as a `void` channel: callers fire-and-forget. We never throw
 * here — diagnostic plumbing must not become its own failure source.
 *
 * @param _ev - Electron event object (unused).
 * @param request - Severity, message, and optional detail.
 */
export const onLogForward = (_ev: Electron.IpcMainEvent, request: LogForwardRequest): void => {
  const prefix = `[renderer:${request.level}]`;
  const detail = request.detail !== undefined ? `\n${request.detail}` : "";
  const line = `${prefix} ${request.message}${detail}`;

  if (request.level === "error") {
    console.error(line);
    return;
  }

  if (request.level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
};
