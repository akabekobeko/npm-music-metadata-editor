import { useState } from "react";

import { formatTimeInput, parseTimeInput } from "@/features/lyrics/parseTimeInput";
import type { SyncedLine } from "@/features/lyrics/types";

/** One synchronized line plus a UI-only stable id used as the React key. */
export type SyncedLineEntry = {
  /** UI-only stable id used as the React key across reorders. */
  readonly id: string;
  /** Synchronized line wrapped by this entry. */
  readonly line: SyncedLine;
};

/** Args for {@link useSynchronizedTab}. */
type Args = {
  /** Current entries in `timeMs` ascending order. */
  readonly entries: readonly SyncedLineEntry[];
  /** Receive a new entry list — kept sorted by the parent. */
  readonly onChange: (entries: readonly SyncedLineEntry[]) => void;
};

/** Per-row local state — only the time input needs validation feedback. */
type RowEditorState = {
  /** Whether the time input failed to parse on its last blur. */
  readonly invalid: boolean;
};

/** Argument shape for the time-blur handler. */
type TimeBlurTarget = {
  /** Entry id whose row is blurring. */
  readonly entryId: string;
  /** Row index, used to address per-row state arrays. */
  readonly index: number;
  /** Raw input text at blur time. */
  readonly value: string;
};

/** Public surface returned by {@link useSynchronizedTab}. */
export type SynchronizedTabState = {
  /** Per-row UI state, indexed by `entries` position. */
  readonly rowState: readonly RowEditorState[];
  /** Live time-input drafts, indexed by `entries` position. */
  readonly timeDrafts: readonly string[];
  /** Update one row's draft text in response to the time input's `onChange`. */
  readonly setTimeDraftAt: (index: number, value: string) => void;
  /** Validate-and-commit a time input on blur. */
  readonly handleTimeBlur: (target: TimeBlurTarget) => void;
  /** Commit a text change for the given entry. */
  readonly handleTextChange: (entryId: string, value: string) => void;
  /** Append a fresh empty row to the entry list. */
  readonly handleAddLine: () => void;
  /** Remove the entry with the given id. */
  readonly handleRemoveLine: (entryId: string) => void;
};

/**
 * Mint a fresh stable id for a new synchronized-line row.
 *
 * Uses `crypto.randomUUID` so React picks up reorderings via key identity,
 * not array position — `noArrayIndexKey` is incompatible with the row-level
 * delete + re-sort flow.
 *
 * @returns A v4 UUID.
 */
const mintEntryId = (): string => globalThis.crypto.randomUUID();

/**
 * Sort entries by their line's `timeMs` ascending, keeping ids attached.
 *
 * @param entries - Unsorted entries.
 * @returns A new array with entries sorted by `timeMs`.
 */
const sortEntries = (entries: readonly SyncedLineEntry[]): readonly SyncedLineEntry[] =>
  [...entries].sort((a, b) => a.line.timeMs - b.line.timeMs);

/**
 * Owns every piece of state and side-effect the {@link SynchronizedTab}
 * component needs.
 *
 * Maintains the per-row time-draft strings and `aria-invalid` flags
 * separately from the upstream entry list so that an in-progress edit does
 * not push an invalid `timeMs` into the parent's draft. Time edits commit
 * upward only when the input parses successfully; text edits commit on
 * every keystroke. After every commit, entries are re-sorted by `timeMs`
 * to match the `LyricsInfo.synchronized` invariant the core writers expect.
 *
 * @param args - Component props passed straight through.
 * @returns The view-model the component renders against.
 */
export const useSynchronizedTab = ({ entries, onChange }: Args): SynchronizedTabState => {
  const [rowState, setRowState] = useState<readonly RowEditorState[]>(() =>
    entries.map(() => ({ invalid: false })),
  );
  const [timeDrafts, setTimeDrafts] = useState<readonly string[]>(() =>
    entries.map((entry) => formatTimeInput(entry.line.timeMs)),
  );

  const syncDraftLength = (next: readonly SyncedLineEntry[]): void => {
    setTimeDrafts(next.map((entry) => formatTimeInput(entry.line.timeMs)));
    setRowState(next.map(() => ({ invalid: false })));
  };

  const updateLine = (entryId: string, patch: Partial<SyncedLine>): void => {
    const updated = entries.map((entry) =>
      entry.id === entryId ? { ...entry, line: { ...entry.line, ...patch } } : entry,
    );
    const sorted = sortEntries(updated);
    onChange(sorted);
    syncDraftLength(sorted);
  };

  const setTimeDraftAt = (index: number, value: string): void => {
    setTimeDrafts((prev) => prev.map((current, i) => (i === index ? value : current)));
  };

  const handleTimeBlur = (target: TimeBlurTarget): void => {
    const { entryId, index, value } = target;
    const ms = parseTimeInput(value);
    if (ms === null) {
      setRowState((prev) => prev.map((row, i) => (i === index ? { invalid: true } : row)));
      return;
    }

    setRowState((prev) => prev.map((row, i) => (i === index ? { invalid: false } : row)));
    updateLine(entryId, { timeMs: ms });
  };

  const handleTextChange = (entryId: string, value: string): void => {
    const next = entries.map((entry) =>
      entry.id === entryId ? { ...entry, line: { ...entry.line, text: value } } : entry,
    );
    onChange(next);
  };

  const handleAddLine = (): void => {
    const lastTime = entries[entries.length - 1]?.line.timeMs ?? 0;
    const next: readonly SyncedLineEntry[] = [
      ...entries,
      { id: mintEntryId(), line: { timeMs: lastTime, text: "" } },
    ];
    onChange(next);
    syncDraftLength(next);
  };

  const handleRemoveLine = (entryId: string): void => {
    const next = entries.filter((entry) => entry.id !== entryId);
    onChange(next);
    syncDraftLength(next);
  };

  return {
    rowState,
    timeDrafts,
    setTimeDraftAt,
    handleTimeBlur,
    handleTextChange,
    handleAddLine,
    handleRemoveLine,
  };
};
