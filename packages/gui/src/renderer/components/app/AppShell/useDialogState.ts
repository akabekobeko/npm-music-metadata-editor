import { type Dispatch, useCallback, useState } from "react";

import type { EditAction } from "@/features/edit/store";
import type { FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";
import type { LyricsInfo, PictureInfo } from "../../../../main/ipc/types";

/** Discriminator for the modal currently mounted on top of the spreadsheet. */
export type ActiveDialog =
  | { readonly kind: "pictures"; readonly filePath: string }
  | { readonly kind: "lyrics"; readonly filePath: string }
  | null;

/** Args for {@link useDialogState}. */
type Args = {
  /** Current rows — used to look up `activeRow` from `activeDialog.filePath`. */
  readonly rows: readonly TrackRow[];
  /** Edit reducer dispatch — for `commitPictures` / `commitLyrics`. */
  readonly editDispatch: Dispatch<EditAction>;
  /** Format support matrix — gates the open handlers when the format is unsupported. */
  readonly support: FormatSupportMap;
  /** Notification sink used when the open is rejected. */
  readonly notify: (message: string) => void;
};

/** Public surface returned by {@link useDialogState}. */
export type DialogState = {
  /** Currently-mounted dialog (or `null` when none). */
  readonly active: ActiveDialog;
  /** The row whose file path matches `active.filePath`, or `null`. */
  readonly activeRow: TrackRow | null;
  /** Open the Pictures modal for the given row. No-op if format unsupported. */
  readonly openPictures: (row: TrackRow) => void;
  /** Open the Lyrics modal for the given row. No-op if format unsupported. */
  readonly openLyrics: (row: TrackRow) => void;
  /** Close whichever modal is currently mounted. */
  readonly close: () => void;
  /** Commit pictures from the Pictures modal and close it. */
  readonly applyPictures: (pictures: readonly PictureInfo[]) => void;
  /** Commit lyrics from the Lyrics modal and close it. */
  readonly applyLyrics: (lyrics: LyricsInfo | undefined) => void;
};

/**
 * Drive the Pictures / Lyrics modals from a single discriminated state.
 *
 * Programmatic open / close is required (the trigger is a row click far away
 * in the spreadsheet, the close fires on apply / cancel from inside the
 * modal), so `DialogTrigger` from base-ui doesn't fit the topology here.
 * Instead we centralise the `activeDialog` reducer-style state plus its
 * derived `activeRow` lookup, and expose narrow `openPictures` / `openLyrics`
 * / `close` / `applyPictures` / `applyLyrics` handlers.
 *
 * Format-support gating lives here too: opening a modal for a format that
 * can't carry the corresponding metadata flips a transient status toast and
 * does not mount the dialog.
 *
 * @param args - Rows, edit dispatch, support matrix, notify sink.
 * @returns The dialog state plus its handlers.
 */
export const useDialogState = ({ rows, editDispatch, support, notify }: Args): DialogState => {
  const [active, setActive] = useState<ActiveDialog>(null);

  const openPictures = useCallback(
    (row: TrackRow): void => {
      const entry = support.get(row.track.audioFormat);
      if (entry !== undefined && !entry.supportsPictures) {
        notify(`${row.track.audioFormat.toUpperCase()} does not support pictures.`);
        return;
      }

      setActive({ kind: "pictures", filePath: row.filePath });
    },
    [support, notify],
  );

  const openLyrics = useCallback(
    (row: TrackRow): void => {
      const entry = support.get(row.track.audioFormat);
      if (entry !== undefined && !entry.supportsLyrics) {
        notify(`${row.track.audioFormat.toUpperCase()} does not support lyrics.`);
        return;
      }

      setActive({ kind: "lyrics", filePath: row.filePath });
    },
    [support, notify],
  );

  const close = useCallback((): void => {
    setActive(null);
  }, []);

  const applyPictures = useCallback(
    (pictures: readonly PictureInfo[]): void => {
      setActive((current) => {
        if (current?.kind !== "pictures") {
          return current;
        }

        editDispatch({ type: "commitPictures", filePath: current.filePath, pictures });
        return null;
      });
    },
    [editDispatch],
  );

  const applyLyrics = useCallback(
    (lyrics: LyricsInfo | undefined): void => {
      setActive((current) => {
        if (current?.kind !== "lyrics") {
          return current;
        }

        editDispatch({ type: "commitLyrics", filePath: current.filePath, lyrics });
        return null;
      });
    },
    [editDispatch],
  );

  const activeRow =
    active === null ? null : (rows.find((row) => row.filePath === active.filePath) ?? null);

  return { active, activeRow, openPictures, openLyrics, close, applyPictures, applyLyrics };
};
