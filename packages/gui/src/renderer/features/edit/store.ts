import type { IpcError, LyricsInfo, PictureInfo, TagData } from "@mme/ipc";
import { type Dispatch, useReducer } from "react";
import type { TrackRow } from "../tracks/types.js";
import { revertRow } from "./revertRow.js";
import { setLyrics } from "./setLyrics.js";
import { setPictures } from "./setPictures.js";
import { setTagValue } from "./setTagValue.js";

/**
 * Maximum number of past row snapshots retained for undo.
 *
 * Aligns with the Phase 4 plan (~50 entries). When the buffer overflows the
 * oldest entry is dropped silently — older operations become unreachable from
 * undo, which mirrors how editors like VS Code and Mp3tag behave.
 */
const HISTORY_LIMIT = 50;

/**
 * State of the edit slice.
 *
 * `rows` is the live, edit-applied view of every open file. `history` is a
 * ring buffer of past `rows` snapshots; `undo` walks one step back.
 */
export type EditState = {
  /** Live, edit-applied view of every open file. */
  readonly rows: readonly TrackRow[];
  /** Bounded ring buffer of past `rows` snapshots for undo. */
  readonly history: readonly (readonly TrackRow[])[];
};

/** Discriminated union of every action the edit reducer accepts. */
export type EditAction =
  /** Replace the row set wholesale and clear undo history. */
  | { readonly type: "load"; readonly rows: readonly TrackRow[] }
  /** Commit a single tag-cell edit. */
  | {
      readonly type: "commit";
      /** Row identified by absolute path. */
      readonly filePath: string;
      /** `TagData` field being patched. */
      readonly field: keyof TagData;
      /** New value, or `undefined` to clear the field. */
      readonly value: string | number | undefined;
    }
  /** Commit the result of the pictures dialog for one row. */
  | {
      readonly type: "commitPictures";
      /** Row identified by absolute path. */
      readonly filePath: string;
      /** Replacement picture list. */
      readonly pictures: readonly PictureInfo[];
    }
  /** Commit the result of the lyrics dialog for one row. */
  | {
      readonly type: "commitLyrics";
      /** Row identified by absolute path. */
      readonly filePath: string;
      /** Replacement lyrics, or `undefined` to clear them. */
      readonly lyrics: LyricsInfo | undefined;
    }
  /** Revert one row's track to its origin snapshot. */
  | { readonly type: "revert"; readonly filePath: string }
  /** Replace the entire row array (used by paste). */
  | { readonly type: "applyChange"; readonly nextRows: readonly TrackRow[] }
  /** Attach / clear sticky save errors after a Save All run. */
  | {
      readonly type: "markSaveErrors";
      /** Per-path error map; `undefined` clears the prior flag. */
      readonly errors: ReadonlyMap<string, IpcError | undefined>;
    }
  /** Walk one step back through the history stack. */
  | { readonly type: "undo" };

/** Empty initial state — no rows, empty history. */
export const initialEditState: EditState = { rows: [], history: [] };

/**
 * Push the current row snapshot onto the bounded history stack.
 *
 * @param history - Existing history stack.
 * @param snapshot - Row array captured before the next mutation.
 * @returns A new history stack with `snapshot` appended; the oldest entry is
 *   dropped when the limit is exceeded.
 */
const pushHistory = (
  history: readonly (readonly TrackRow[])[],
  snapshot: readonly TrackRow[],
): readonly (readonly TrackRow[])[] => {
  const next = [...history, snapshot];
  if (next.length > HISTORY_LIMIT) {
    next.shift();
  }

  return next;
};

/**
 * Apply a row replacement and record a history entry.
 *
 * @param state - Current edit state.
 * @param nextRows - Replacement row array.
 * @returns Next state with `rows = nextRows` and the prior rows pushed to
 *   history.
 */
const transitionRows = (state: EditState, nextRows: readonly TrackRow[]): EditState => ({
  rows: nextRows,
  history: pushHistory(state.history, state.rows),
});

/**
 * Strip a previously-set `saveError` flag from a row.
 *
 * @param row - Row to strip.
 * @returns A row reference without the `saveError` field.
 */
const withoutSaveError = (row: TrackRow): TrackRow => {
  if (row.saveError === undefined) {
    return row;
  }

  const { saveError: _saveError, ...rest } = row;
  return rest;
};

/**
 * Reducer for the edit slice.
 *
 * `load` is the only action that clears history — opening a fresh batch of
 * files invalidates undo because the prior rows are no longer addressable by
 * file path. Every mutation goes through {@link transitionRows} so undo
 * correctly walks back one step regardless of which action produced the
 * change.
 *
 * @param state - Current edit state.
 * @param action - Action to apply.
 * @returns Next state. Returns the same reference when nothing changes.
 */
export const editReducer = (state: EditState, action: EditAction): EditState => {
  if (action.type === "load") {
    return { rows: action.rows, history: [] };
  }

  if (action.type === "commit") {
    const nextRows = state.rows.map((row) =>
      row.filePath === action.filePath
        ? setTagValue({ row, field: action.field, value: action.value })
        : row,
    );
    return transitionRows(state, nextRows);
  }

  if (action.type === "commitPictures") {
    const nextRows = state.rows.map((row) =>
      row.filePath === action.filePath ? setPictures({ row, pictures: action.pictures }) : row,
    );
    return transitionRows(state, nextRows);
  }

  if (action.type === "commitLyrics") {
    const nextRows = state.rows.map((row) =>
      row.filePath === action.filePath ? setLyrics({ row, lyrics: action.lyrics }) : row,
    );
    return transitionRows(state, nextRows);
  }

  if (action.type === "revert") {
    const nextRows = state.rows.map((row) =>
      row.filePath === action.filePath ? revertRow(row) : row,
    );
    return transitionRows(state, nextRows);
  }

  if (action.type === "applyChange") {
    return transitionRows(state, action.nextRows);
  }

  if (action.type === "markSaveErrors") {
    const nextRows = state.rows.map((row) => {
      if (!action.errors.has(row.filePath)) {
        return row;
      }

      const next = action.errors.get(row.filePath);
      return next === undefined ? withoutSaveError(row) : { ...row, saveError: next };
    });
    return { ...state, rows: nextRows };
  }

  if (action.type === "undo") {
    if (state.history.length === 0) {
      return state;
    }

    const prev = state.history[state.history.length - 1] ?? state.rows;
    const history = state.history.slice(0, -1);
    return { rows: prev, history };
  }

  return state;
};

/**
 * Hook that wires {@link editReducer} into a component tree.
 *
 * @returns Current state and the dispatch function.
 */
export const useEditStore = (): {
  readonly state: EditState;
  readonly dispatch: Dispatch<EditAction>;
} => {
  const [state, dispatch] = useReducer(editReducer, initialEditState);
  return { state, dispatch };
};
