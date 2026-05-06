import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatTimeInput } from "@/features/lyrics/parseTimeInput";

import { type SyncedLineEntry, useSynchronizedTab } from "./useSynchronizedTab.js";

export type { SyncedLineEntry } from "./useSynchronizedTab.js";

/** Props for {@link SynchronizedTab}. */
export type SynchronizedTabProps = {
  /** Current entries in `timeMs` ascending order. */
  readonly entries: readonly SyncedLineEntry[];
  /** Receive a new entry list — kept sorted by the parent. */
  readonly onChange: (entries: readonly SyncedLineEntry[]) => void;
  /** Optional toolbar slot rendered next to `+ Line` (e.g. Import / Export buttons). */
  readonly extraButtons?: React.ReactNode;
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
  const {
    rowState,
    timeDrafts,
    setTimeDraftAt,
    handleTimeBlur,
    handleTextChange,
    handleAddLine,
    handleRemoveLine,
  } = useSynchronizedTab({ entries, onChange });

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
                      onChange={(event) => setTimeDraftAt(index, event.target.value)}
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
