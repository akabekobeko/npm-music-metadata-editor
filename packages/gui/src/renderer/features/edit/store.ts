import { type Dispatch, useReducer } from "react";
import type { LyricsInfo, PictureInfo, TagData } from "../../../main/ipc/types.js";
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
  readonly rows: readonly TrackRow[];
  readonly history: readonly (readonly TrackRow[])[];
};

/** Discriminated union of every action the edit reducer accepts. */
export type EditAction =
  | { readonly type: "load"; readonly rows: readonly TrackRow[] }
  | {
      readonly type: "commit";
      readonly filePath: string;
      readonly field: keyof TagData;
      readonly value: string | number | undefined;
    }
  | {
      readonly type: "commitPictures";
      readonly filePath: string;
      readonly pictures: readonly PictureInfo[];
    }
  | {
      readonly type: "commitLyrics";
      readonly filePath: string;
      readonly lyrics: LyricsInfo | undefined;
    }
  | { readonly type: "revert"; readonly filePath: string }
  | { readonly type: "applyChange"; readonly nextRows: readonly TrackRow[] }
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
