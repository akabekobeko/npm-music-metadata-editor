import { LyricsDialog } from "../LyricsDialog/LyricsDialog";
import { PicturesDialog } from "../PicturesDialog/PicturesDialog";
import type { DialogState } from "./useDialogState.js";

/** Props for {@link ActiveDialogs}. */
export type ActiveDialogsProps = {
  /** Dialog state from `useDialogState`. */
  readonly state: DialogState;
  /** Notification sink forwarded to the dialogs (used for inline toasts). */
  readonly notify: (message: string) => void;
};

/**
 * Mount the Pictures or Lyrics modal that matches the current dialog state.
 *
 * Conditional mount (rather than always-mounted with `open={...}`) keeps the
 * dialog contents free to maintain heavy local draft state without burning
 * memory while the user isn't editing — the modal completely tears down on
 * close. Programmatic open/close from the spreadsheet's row click means
 * `DialogTrigger` doesn't compose; we own the `active` state in the parent.
 *
 * @param props - Dialog state plus notify sink.
 * @returns Either a `<PicturesDialog>`, `<LyricsDialog>`, or `null`.
 */
export function ActiveDialogs({ state, notify }: ActiveDialogsProps) {
  const { active, activeRow, close, applyPictures, applyLyrics } = state;

  if (active === null || activeRow === null) {
    return null;
  }

  if (active.kind === "pictures") {
    return (
      <PicturesDialog
        filePath={activeRow.filePath}
        initialPictures={activeRow.track.pictures}
        onApply={applyPictures}
        onClose={close}
        onNotify={notify}
      />
    );
  }

  return (
    <LyricsDialog
      filePath={activeRow.filePath}
      initialLyrics={activeRow.track.lyrics}
      onApply={applyLyrics}
      onClose={close}
      onNotify={notify}
    />
  );
}
