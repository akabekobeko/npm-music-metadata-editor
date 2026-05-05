import { type Dispatch, useReducer } from "react";
import type { TrackLoadError, TrackRow } from "./types.js";

/** Tracks slice of the renderer state. */
export type TracksState = {
  readonly rows: readonly TrackRow[];
  readonly errors: readonly TrackLoadError[];
  readonly loading: boolean;
};

/**
 * Payload for the `load:done` action: rows + errors collected from one IPC
 * `loadMany` round-trip. The reducer merges them into the running state with
 * last-write-wins semantics keyed by file path.
 */
type LoadDonePayload = {
  readonly rows: readonly TrackRow[];
  readonly errors: readonly TrackLoadError[];
};

/** Discriminated union of every action the tracks reducer accepts. */
export type TracksAction =
  | { readonly type: "load:start" }
  | { readonly type: "load:done"; readonly payload: LoadDonePayload }
  | { readonly type: "clear" };

/** Empty initial state — no rows, no errors, not loading. */
export const initialTracksState: TracksState = {
  rows: [],
  errors: [],
  loading: false,
};

/**
 * Reducer of the tracks slice.
 *
 * Row identity is the absolute file path. Re-loading an already-open path
 * replaces the previous row instead of duplicating, and clears any earlier
 * error for the same path. Errors for paths that are not also in `rows.<path>`
 * stay around until the user re-loads or clears.
 *
 * @param state - Current state.
 * @param action - Action to apply.
 * @returns Next state. Returns the same reference when nothing changes.
 */
export const tracksReducer = (state: TracksState, action: TracksAction): TracksState => {
  if (action.type === "load:start") {
    return { ...state, loading: true };
  }

  if (action.type === "load:done") {
    return mergeLoadDone(state, action.payload);
  }

  if (action.type === "clear") {
    return initialTracksState;
  }

  return state;
};

/**
 * Merge the result of one `loadMany` round-trip into the running tracks state.
 *
 * @param state - State before merging.
 * @param payload - Rows and errors produced by `loadTracks`.
 * @returns State with rows merged by path (last write wins), errors merged the
 *   same way, errors for any newly-loaded path cleared, and `loading: false`.
 */
const mergeLoadDone = (state: TracksState, payload: LoadDonePayload): TracksState => {
  const rowsByPath = new Map<string, TrackRow>(state.rows.map((row) => [row.filePath, row]));
  for (const row of payload.rows) {
    rowsByPath.set(row.filePath, row);
  }

  const errorsByPath = new Map<string, TrackLoadError>(
    state.errors.map((entry) => [entry.filePath, entry]),
  );
  for (const row of payload.rows) {
    errorsByPath.delete(row.filePath);
  }

  for (const entry of payload.errors) {
    errorsByPath.set(entry.filePath, entry);
  }

  return {
    rows: [...rowsByPath.values()],
    errors: [...errorsByPath.values()],
    loading: false,
  };
};

/**
 * Hook that wires {@link tracksReducer} into a component tree.
 *
 * @returns Current state and the dispatch function. Components that only need
 *   to read state can pull `state` and ignore `dispatch`.
 */
export const useTracksStore = (): {
  readonly state: TracksState;
  readonly dispatch: Dispatch<TracksAction>;
} => {
  const [state, dispatch] = useReducer(tracksReducer, initialTracksState);
  return { state, dispatch };
};
