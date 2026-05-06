import { useCallback, useMemo, useState } from "react";

import { buildLyricsInfoFromDraft } from "@/features/lyrics/buildLyricsInfoFromDraft";
import { lyricsInfoToDraft } from "@/features/lyrics/lyricsInfoToDraft";
import type { LyricsDraft, SyncedLine } from "@/features/lyrics/types";
import { basename } from "@/libs/basename";

import type { LyricsInfo } from "../../../../main/ipc/types";
import type { SyncedLineEntry } from "./useSynchronizedTab.js";

/** Args for {@link useLyricsDialog}. */
type Args = {
  /** Absolute path of the row being edited; used as the title's subtitle. */
  readonly filePath: string;
  /** Lyrics block to seed the dialog with — `undefined` means "no lyrics yet". */
  readonly initialLyrics: LyricsInfo | undefined;
  /** Commit the edited lyrics back to the edit store; `undefined` clears them. */
  readonly onApply: (lyrics: LyricsInfo | undefined) => void;
  /** Surface a transient status message (toast). */
  readonly onNotify: (message: string) => void;
};

/** Public surface returned by {@link useLyricsDialog}. */
export type LyricsDialogState = {
  /** Current draft of both lyric forms. */
  readonly draft: LyricsDraft;
  /** Synchronized-tab entries kept in `timeMs` ascending order. */
  readonly syncedEntries: readonly SyncedLineEntry[];
  /** Patch the draft's editable fields (language / description / synced / unsynced). */
  readonly updateDraft: (patch: Partial<LyricsDraft>) => void;
  /** Receive a new entry list from {@link SynchronizedTab} and mirror into the draft. */
  readonly handleSyncedEntriesChange: (entries: readonly SyncedLineEntry[]) => void;
  /** Commit the current draft back to the host. */
  readonly handleApply: () => void;
  /** Replace the synchronized list with the imported lines, sorted by time. */
  readonly handleSyncImport: (imported: readonly SyncedLine[]) => void;
  /** Suggested LRC export filename, derived from the source path's stem. */
  readonly baseFileName: string;
};

/**
 * Owns every piece of state and side-effect the {@link LyricsDialog}
 * component needs.
 *
 * Maintains a {@link LyricsDraft} that holds both lyric forms simultaneously;
 * the Apply path collapses empty fields back to `undefined` via
 * {@link buildLyricsInfoFromDraft} so the row's `lyrics` matches the core
 * representation precisely. The synchronized-tab entries carry an extra
 * UI-only `id` so React can track reorderings across edits.
 *
 * @param args - Component props passed straight through.
 * @returns The view-model the component renders against.
 */
export const useLyricsDialog = ({
  filePath,
  initialLyrics,
  onApply,
  onNotify,
}: Args): LyricsDialogState => {
  const initialDraft = useMemo(() => lyricsInfoToDraft(initialLyrics), [initialLyrics]);
  const [draft, setDraft] = useState<LyricsDraft>(initialDraft);
  const [syncedEntries, setSyncedEntries] = useState<readonly SyncedLineEntry[]>(() =>
    initialDraft.synchronized.map((line) => ({ id: globalThis.crypto.randomUUID(), line })),
  );

  const updateDraft = useCallback((patch: Partial<LyricsDraft>): void => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleSyncedEntriesChange = useCallback(
    (entries: readonly SyncedLineEntry[]): void => {
      setSyncedEntries(entries);
      updateDraft({ synchronized: entries.map((entry) => entry.line) });
    },
    [updateDraft],
  );

  const handleApply = useCallback((): void => {
    onApply(buildLyricsInfoFromDraft(draft));
  }, [draft, onApply]);

  const handleSyncImport = useCallback(
    (imported: readonly SyncedLine[]): void => {
      const merged = [...imported].sort((a, b) => a.timeMs - b.timeMs);
      const entries: readonly SyncedLineEntry[] = merged.map((line) => ({
        id: globalThis.crypto.randomUUID(),
        line,
      }));
      setSyncedEntries(entries);
      updateDraft({ synchronized: merged });
      onNotify(`Imported ${imported.length} synchronized lines.`);
    },
    [updateDraft, onNotify],
  );

  const baseFileName = basename(filePath).replace(/\.[^.]+$/, "");

  return {
    draft,
    syncedEntries,
    updateDraft,
    handleSyncedEntriesChange,
    handleApply,
    handleSyncImport,
    baseFileName,
  };
};
