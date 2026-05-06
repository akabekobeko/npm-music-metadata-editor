import type { LyricsInfo } from "@mme/ipc";
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
import { basename } from "@/libs/basename";
import { LrcExportButton } from "./LrcExportButton";
import { LrcImportButton } from "./LrcImportButton";
import { PlainTextTab } from "./PlainTextTab";
import { SynchronizedTab } from "./SynchronizedTab";
import { useLyricsDialog } from "./useLyricsDialog.js";

/** Props for {@link LyricsDialog}. */
export type LyricsDialogProps = {
  /** Absolute path of the row being edited; used as the title's subtitle. */
  readonly filePath: string;
  /** Lyrics block to seed the dialog with — `undefined` means "no lyrics yet". */
  readonly initialLyrics: LyricsInfo | undefined;
  /** Commit the edited lyrics back to the edit store; `undefined` clears them. */
  readonly onApply: (lyrics: LyricsInfo | undefined) => void;
  /** Close the dialog without applying. */
  readonly onClose: () => void;
  /** Surface a transient status message (toast). */
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
  const {
    draft,
    syncedEntries,
    updateDraft,
    handleSyncedEntriesChange,
    handleApply,
    handleSyncImport,
    baseFileName,
  } = useLyricsDialog({ filePath, initialLyrics, onApply, onNotify });

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
