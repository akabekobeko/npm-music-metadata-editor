import type { BrowserWindow, OpenDialogOptions, OpenDialogReturnValue } from "electron";
import type { IpcRequestOf, IpcResponseOf } from "../../../shared/ipc-contract.js";
import { toIpcError } from "../errors/toIpcError.js";

/**
 * Extension filter applied to the open-file dialog.
 *
 * Mirrors the union of {@link AudioFormat} extensions accepted by core. When a
 * new format is added to the registry, this list is the place to extend so the
 * dialog stops hiding it.
 */
const AUDIO_EXTENSIONS: readonly string[] = [
  "mp3",
  "flac",
  "m4a",
  "mp4",
  "ogg",
  "opus",
  "wav",
  "aiff",
  "aif",
  "wma",
  "ape",
];

/**
 * Subset of `Electron.dialog.showOpenDialog` we depend on.
 *
 * Defining the type locally keeps {@link createOpenFilesHandler} importable
 * from a Node context (vitest) without pulling in the `electron` value module,
 * which is only resolvable when the process is launched as Electron.
 */
export type ShowOpenDialog = (
  windowOrOptions: BrowserWindow | OpenDialogOptions,
  options?: OpenDialogOptions,
) => Promise<OpenDialogReturnValue>;

/** Arguments for {@link createOpenFilesHandler}. */
type Args = {
  /** Dialog backend; injectable for unit tests. */
  showOpenDialog: ShowOpenDialog;
  /**
   * Lookup of the currently focused window. The dialog uses it as a parent so
   * the modal attaches to the right BrowserWindow on macOS / Linux.
   */
  getFocusedWindow: () => BrowserWindow | null;
};

/**
 * Build the `mme:dialog:openFiles` handler with injected Electron primitives.
 *
 * Splitting the factory from the registration keeps the handler unit-testable
 * without spinning up a real Electron app: tests pass a fake `showOpenDialog`
 * and assert the response shape.
 *
 * @returns The IPC handler closure.
 */
export const createOpenFilesHandler =
  ({ showOpenDialog, getFocusedWindow }: Args) =>
  async (
    request: IpcRequestOf<"mme:dialog:openFiles">,
  ): Promise<IpcResponseOf<"mme:dialog:openFiles">> => {
    try {
      const multiple = request.multiple ?? true;
      const parent = getFocusedWindow();
      const properties: OpenDialogOptions["properties"] = ["openFile"];
      if (multiple) {
        properties.push("multiSelections");
      }

      const options: OpenDialogOptions = {
        properties,
        filters: [
          { name: "Audio", extensions: [...AUDIO_EXTENSIONS] },
          { name: "All Files", extensions: ["*"] },
        ],
      };

      const result = await (parent === null
        ? showOpenDialog(options)
        : showOpenDialog(parent, options));

      if (result.canceled) {
        return { ok: true, value: [] };
      }

      return { ok: true, value: result.filePaths };
    } catch (error) {
      const ipcError = toIpcError(error);
      console.error("[mme:dialog:openFiles]", ipcError);
      return { ok: false, error: ipcError };
    }
  };
