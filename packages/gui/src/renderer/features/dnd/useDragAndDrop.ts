import { useEffect } from "react";

/** Args for {@link useDragAndDrop}. */
type Args = {
  /**
   * Called once Main has expanded folder drops to a flat list of audio
   * paths. Empty inputs (every file rejected by the extension filter or
   * dropped folders that contained nothing audio) call back with `[]` so
   * the caller can show a transient "no audio files" toast if it cares.
   */
  readonly onPaths: (paths: readonly string[]) => void;
  /** Disables the listener entirely while a load / save is in flight. */
  readonly disabled?: boolean;
};

/**
 * Wire window-level `dragover` / `drop` listeners so the entire app surface
 * accepts file & folder drops.
 *
 * The handler:
 *   1. Cancels the browser's default behaviour (otherwise Chromium navigates
 *      away from the renderer page).
 *   2. Translates `DataTransferItem`/`File` lists into absolute paths via
 *      `window.mme.dnd.pathFor` (Electron's `webUtils.getPathForFile`).
 *   3. Asks Main to expand folders to audio file paths
 *      (`mme:dialog:expandPaths`) — the renderer never walks the FS itself.
 *
 * @param args - Drop callback and disabled flag.
 */
export const useDragAndDrop = ({ onPaths, disabled = false }: Args): void => {
  useEffect(() => {
    if (disabled) {
      return;
    }

    const onDragOver = (event: DragEvent): void => {
      event.preventDefault();
      if (event.dataTransfer !== null) {
        event.dataTransfer.dropEffect = "copy";
      }
    };

    const onDrop = (event: DragEvent): void => {
      event.preventDefault();
      const files = event.dataTransfer?.files;
      if (files === undefined || files.length === 0) {
        return;
      }

      const paths: string[] = [];
      for (const file of Array.from(files)) {
        const path = window.mme.dnd.pathFor(file);
        if (path !== "") {
          paths.push(path);
        }
      }

      if (paths.length === 0) {
        onPaths([]);
        return;
      }

      void window.mme.dnd.expandPaths({ paths }).then((response) => {
        if (response.ok) {
          onPaths(response.value.filePaths);
        } else {
          onPaths([]);
        }
      });
    };

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    };
  }, [onPaths, disabled]);
};
