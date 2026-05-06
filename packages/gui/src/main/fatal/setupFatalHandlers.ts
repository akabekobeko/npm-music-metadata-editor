import type { BrowserWindow } from "electron";
import { IpcKeys } from "../ipc/ipcKeys.js";
import type { FatalPayload } from "../ipc/types.js";

/** Args for {@link setupFatalHandlers}. */
type Args = {
  /** Function returning the currently focused window — re-evaluated per error. */
  readonly getWindow: () => BrowserWindow | null;
};

/**
 * Hook Main's `uncaughtException` and `unhandledRejection` and forward each
 * crash to the focused renderer's `mme:fatal` channel.
 *
 * The Renderer surfaces a modal with `Reload` / `Quit` buttons. We
 * deliberately do not call `app.quit()` here because the user might want to
 * reload the renderer instead — the modal owns that decision.
 *
 * Errors are logged to stderr in addition to the IPC send so the
 * `electron-log` transport sees them even when no renderer is alive yet
 * (e.g. crashes during early `whenReady`).
 *
 * @param args - Function that resolves the target window when an error fires.
 */
export const setupFatalHandlers = ({ getWindow }: Args): void => {
  const send = (payload: FatalPayload): void => {
    console.error(`[fatal:${payload.source}]`, payload.message, payload.stack ?? "");
    const window = getWindow();
    if (window === null || window.webContents.isDestroyed()) {
      return;
    }

    window.webContents.send(IpcKeys.Fatal, payload);
  };

  process.on("uncaughtException", (error: Error) => {
    send(toPayload("main", error));
  });

  process.on("unhandledRejection", (reason: unknown) => {
    send(toPayload("main", reason));
  });
};

/**
 * Coerce an unknown error value into the `FatalPayload` shape.
 *
 * Mirrors the conventions used by `toIpcError`: the `Error.message` is
 * preserved verbatim and the stack is forwarded only when the value really
 * is an `Error` (otherwise we serialise a `String(value)` fallback).
 *
 * @param source - Origin tag — used by the modal to colour the heading.
 * @param value - Whatever was thrown.
 * @returns The payload that goes onto the IPC wire.
 */
const toPayload = (source: FatalPayload["source"], value: unknown): FatalPayload => {
  if (value instanceof Error) {
    return {
      source,
      message: value.message,
      stack: value.stack,
    };
  }

  return {
    source,
    message: typeof value === "string" ? value : `${String(value)}`,
  };
};
