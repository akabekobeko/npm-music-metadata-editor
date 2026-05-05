import { useCallback, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildLyricsInfoFromDraft } from "@/features/lyrics/buildLyricsInfoFromDraft";
import { lyricsInfoToDraft } from "@/features/lyrics/lyricsInfoToDraft";
import type { LyricsDraft, SyncedLine } from "@/features/lyrics/types";
import { basename } from "@/libs/basename";
import type { LyricsInfo } from "../../../../main/ipc/types";

import { LrcExportButton } from "./LrcExportButton";
import { LrcImportButton } from "./LrcImportButton";
import { PlainTextTab } from "./PlainTextTab";
import { type SyncedLineEntry, SynchronizedTab } from "./SynchronizedTab";

/** Props for {@link LyricsDialog}. */
export type LyricsDialogProps = {
  readonly filePath: string;
  readonly initialLyrics: LyricsInfo | undefined;
  readonly onApply: (lyrics: LyricsInfo | undefined) => void;
  readonly onClose: () => void;
  readonly onNotify: (message: string) => void;
};

/**
 * Modal editor for the lyrics block of a single track.
 *
 * Owns a {@link LyricsDraft} that holds both lyric forms simultaneously; the
 * Apply path collapses empty fields back to `undefined` via
 * {@link buildLyricsInfoFromDraft} so the row's `lyrics` matches the core
 * representation precisely.
 *
 * @returns The dialog markup.
 */
export function LyricsDialog({
  filePath,
  initialLyrics,
  onApply,
  onClose,
  onNotify,
}: LyricsDialogProps) {
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

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lyrics</DialogTitle>
          <DialogDescription>{basename(filePath)}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Language (ISO-639)</span>
            <Input
              value={draft.language}
              onChange={(event) => updateDraft({ language: event.target.value })}
              placeholder="eng"
              aria-label="Lyrics language"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-xs text-muted-foreground">Description</span>
            <Input
              value={draft.description}
              onChange={(event) => updateDraft({ description: event.target.value })}
              placeholder=""
              aria-label="Lyrics description"
            />
          </div>
        </div>
        <Tabs defaultValue="plain" className="gap-3">
          <TabsList>
            <TabsTrigger value="plain">Plain text</TabsTrigger>
            <TabsTrigger value="synced">Synchronized</TabsTrigger>
          </TabsList>
          <TabsContent value="plain">
            <PlainTextTab
              value={draft.unsynchronized}
              onChange={(value) => updateDraft({ unsynchronized: value })}
            />
          </TabsContent>
          <TabsContent value="synced">
            <SynchronizedTab
              entries={syncedEntries}
              onChange={handleSyncedEntriesChange}
              extraButtons={
                <>
                  <LrcImportButton
                    onImport={handleSyncImport}
                    onError={(message) => onNotify(`Import failed: ${message}`)}
                  />
                  <LrcExportButton
                    defaultName={`${baseFileName}.lrc`}
                    lines={draft.synchronized}
                    onError={onNotify}
                    onSuccess={onNotify}
                  />
                </>
              }
            />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
