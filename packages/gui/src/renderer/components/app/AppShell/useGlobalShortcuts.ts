import { useEffect } from "react";

/** Args for {@link useGlobalShortcuts}. */
type Args = {
  /** Cmd/Ctrl+O — open files. */
  readonly onOpenFiles: () => void;
  /** Cmd/Ctrl+S — save all. */
  readonly onSaveAll: () => void;
  /** When `true`, the Save shortcut is suppressed (e.g. while a save is in flight). */
  readonly saveDisabled: boolean;
};

/**
 * Wire `Cmd/Ctrl+O` (Open) and `Cmd/Ctrl+S` (Save All) to document-level
 * keydown listeners.
 *
 * Save is gated on `saveDisabled` so the user can't queue a second pass over
 * the same dirty rows during a Save All run. Listening at the document is
 * enough because the renderer has a single window; native menu accelerators
 * will replace these in a later phase.
 *
 * @param args - The two callbacks plus the save-gate flag.
 */
export const useGlobalShortcuts = ({ onOpenFiles, onSaveAll, saveDisabled }: Args): void => {
  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const usingMeta = event.metaKey || event.ctrlKey;
      if (!usingMeta) {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "o") {
        event.preventDefault();
        onOpenFiles();
        return;
      }

      if (key === "s" && !saveDisabled) {
        event.preventDefault();
        onSaveAll();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onOpenFiles, onSaveAll, saveDisabled]);
};
