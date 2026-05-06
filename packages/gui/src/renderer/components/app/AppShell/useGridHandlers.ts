import { type Dispatch, useCallback } from "react";

import { expandColumnPaste } from "@/features/edit/expandColumnPaste";
import { applyPaste, parseClipboardText } from "@/features/edit/paste";
import type { EditAction, EditState } from "@/features/edit/store";
import type { FormatSupportMap } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import type { CommitArgs, PasteArgs } from "../Spreadsheet/Spreadsheet";
import { formatPasteSummary } from "./formatPasteSummary.js";

/** Args for {@link useGridHandlers}. */
type Args = {
  readonly editState: EditState;
  readonly editDispatch: Dispatch<EditAction>;
  readonly support: FormatSupportMap;
  /** Notification sink for the post-paste summary toast. */
  readonly notify: (message: string) => void;
};

/** Public surface returned by {@link useGridHandlers}. */
export type GridHandlers = {
  readonly onCommit: (args: CommitArgs) => void;
  readonly onUndo: () => void;
  readonly onPaste: (args: PasteArgs) => void;
};

/**
 * Build the spreadsheet's commit / undo / paste callbacks against the edit reducer.
 *
 * The paste handler is the only non-trivial member: it parses the clipboard,
 * expands column-mode pastes, runs `applyPaste` against the slice of rows the
 * user actually selected, then splices the result back into the full row
 * array. `formatPasteSummary` produces the toast a successful paste shows.
 *
 * @param args - Edit store, support matrix, notify sink.
 * @returns The grid callback bundle.
 */
export const useGridHandlers = ({
  editState,
  editDispatch,
  support,
  notify,
}: Args): GridHandlers => {
  const onCommit = useCallback(
    ({ row, field, value }: CommitArgs): void => {
      editDispatch({ type: "commit", filePath: row.filePath, field, value });
    },
    [editDispatch],
  );

  const onUndo = useCallback((): void => {
    editDispatch({ type: "undo" });
  }, [editDispatch]);

  const onPaste = useCallback(
    ({ columnId, clipboardText, baseRowIndex, maxRows, mode }: PasteArgs): void => {
      const parsed = parseClipboardText(clipboardText).slice(0, maxRows);
      if (parsed.length === 0) {
        return;
      }

      const totalRows = editState.rows.length - baseRowIndex;
      const values = expandColumnPaste({ values: parsed, mode, totalRows });
      const slice = editState.rows.slice(baseRowIndex, baseRowIndex + values.length);
      const outcome = applyPaste({ rows: slice, columnId, values, support });
      const nextRows: readonly TrackRow[] = [
        ...editState.rows.slice(0, baseRowIndex),
        ...outcome.nextRows,
        ...editState.rows.slice(baseRowIndex + values.length),
      ];
      editDispatch({ type: "applyChange", nextRows });
      notify(formatPasteSummary(outcome));
    },
    [editState.rows, editDispatch, support, notify],
  );

  return { onCommit, onUndo, onPaste };
};
