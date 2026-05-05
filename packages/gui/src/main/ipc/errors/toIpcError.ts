import { isMmeError } from "@akabeko/music-metadata-editor";
import type { IpcError } from "../../../shared/ipc-contract.js";

/**
 * Normalize an arbitrary thrown value into an {@link IpcError}.
 *
 * `Error` instances do not survive Electron's structured clone (the prototype
 * chain and `cause` field are dropped), so every IPC handler funnels its
 * failures through this helper to produce a Plain Object the Renderer can read.
 *
 * Branches:
 * - {@link MmeError} → keeps `name` / `code` / `message`; drops `cause` because
 *   Renderer cannot meaningfully consume the underlying chain.
 * - generic `Error` → keeps `name` / `message`; `code` is omitted.
 * - anything else (`null`, `123`, plain object, ...) → wraps as
 *   `{ name: "Error", message: String(value) }`.
 *
 * @param value - The caught value (typically the argument of a `catch` clause).
 * @returns A serialisable error payload.
 */
export const toIpcError = (value: unknown): IpcError => {
  if (isMmeError(value)) {
    return {
      name: value.name,
      code: value.code,
      message: value.message,
    };
  }

  if (value instanceof Error) {
    return {
      name: value.name === "" ? "Error" : value.name,
      message: value.message,
    };
  }

  return {
    name: "Error",
    message: String(value),
  };
};
