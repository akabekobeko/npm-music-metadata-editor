import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimeInput, parseTimeInput } from "@/features/lyrics/parseTimeInput";
import type { SyncedLine } from "@/features/lyrics/types";

/** One synchronized line plus a UI-only stable id used as the React key. */
export type SyncedLineEntry = {
  readonly id: string;
  readonly line: SyncedLine;
};

/** Props for {@link SynchronizedTab}. */
export type SynchronizedTabProps = {
  readonly entries: readonly SyncedLineEntry[];
  readonly onChange: (entries: readonly SyncedLineEntry[]) => void;
  readonly extraButtons?: React.ReactNode;
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

/** Per-row local state — only the time input needs validation feedback. */
type RowEditorState = {
  readonly invalid: boolean;
};

/**
 * Synchronized-tab editor.
 *
 * Each row exposes a `time` input + a `text` input + a remove button. Time
 * edits commit upward only when the input parses successfully; until then
 * the cell shows the raw text and an `aria-invalid` marker. Text edits
 * commit on every keystroke because there is no validation surface for them.
 *
 * Entries are kept in `timeMs` ASC after every edit — this matches the
 * `LyricsInfo.synchronized` invariant the core writers expect.
 *
 * @returns The table markup.
 */
export function SynchronizedTab({ entries, onChange, extraButtons }: SynchronizedTabProps) {
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

  const handleTimeBlur = (target: {
    readonly entryId: string;
    readonly index: number;
    readonly value: string;
  }): void => {
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

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-md border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="w-32 px-2 py-1 text-left font-medium">Time</th>
              <th className="px-2 py-1 text-left font-medium">Text</th>
              <th className="w-12" />
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No synchronized lines.
                </td>
              </tr>
            ) : (
              entries.map((entry, index) => (
                <tr key={entry.id} className="border-t last:border-b-0 [&:last-child]:border-b-0">
                  <td className="px-2 py-1">
                    <Input
                      value={timeDrafts[index] ?? formatTimeInput(entry.line.timeMs)}
                      onChange={(event) =>
                        setTimeDrafts((prev) =>
                          prev.map((value, i) => (i === index ? event.target.value : value)),
                        )
                      }
                      onBlur={(event) =>
                        handleTimeBlur({ entryId: entry.id, index, value: event.target.value })
                      }
                      aria-invalid={rowState[index]?.invalid ?? false}
                      placeholder="00:00.000"
                      aria-label="Line time"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      value={entry.line.text}
                      onChange={(event) => handleTextChange(entry.id, event.target.value)}
                      placeholder="Lyric line"
                      aria-label="Line text"
                    />
                  </td>
                  <td className="px-2 py-1 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLine(entry.id)}
                      aria-label="Remove line"
                    >
                      ✕
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={handleAddLine}>
          + Line
        </Button>
        {extraButtons}
      </div>
    </div>
  );
}
