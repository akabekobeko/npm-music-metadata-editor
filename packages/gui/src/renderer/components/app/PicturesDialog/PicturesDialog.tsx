import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { basename } from "@/libs/basename";

import type { PictureInfo } from "../../../../main/ipc/types";
import { PictureForm } from "./PictureForm";
import { PictureList } from "./PictureList";
import { PicturePreview } from "./PicturePreview";
import { usePicturesDialog } from "./usePicturesDialog.js";

/** Props for {@link PicturesDialog}. */
export type PicturesDialogProps = {
  /** Absolute path of the row being edited; used as the title's subtitle. */
  readonly filePath: string;
  /** Picture set to seed the dialog with. */
  readonly initialPictures: readonly PictureInfo[];
  /** Commit the edited picture set back to the edit store. */
  readonly onApply: (pictures: readonly PictureInfo[]) => void;
  /** Close the dialog without applying. */
  readonly onClose: () => void;
  /** Surface a transient status message (toast). */
  readonly onNotify: (message: string) => void;
};

/**
 * Modal editor for the embedded pictures of a single track.
 *
 * Owns a draft list (`PictureDraft[]`) so edits stay local until the user
 * presses Apply. Add / Replace flow through a hidden `<input type="file">`
 * paired with a drag-and-drop overlay; Export defers to the
 * `mme:dialog:saveFile` + `mme:file:writeBytes` IPC pair so Renderer never
 * touches Node `fs` directly.
 *
 * @returns The dialog markup.
 */
export function PicturesDialog({
  filePath,
  initialPictures,
  onApply,
  onClose,
  onNotify,
}: PicturesDialogProps) {
  const {
    sortedDrafts,
    selected,
    selectedId,
    setSelectedId,
    dirty,
    dragActive,
    addInputRef,
    replaceInputRef,
    updateDraft,
    handleAddClick,
    handleReplaceClick,
    handleAddFiles,
    handleReplaceFile,
    handleExportClick,
    handleRemoveClick,
    handleApplyClick,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    pictureAccept,
  } = usePicturesDialog({ filePath, initialPictures, onApply, onNotify });

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Pictures</DialogTitle>
          <DialogDescription>{basename(filePath)}</DialogDescription>
        </DialogHeader>
        <section
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="Picture drop zone"
          className="relative grid grid-cols-[180px_1fr] gap-3"
        >
          {dragActive ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-ring bg-accent/40 text-sm">
              Drop image files to add
            </div>
          ) : null}
          <div className="h-72 rounded-md border bg-muted/30 p-1.5">
            <PictureList drafts={sortedDrafts} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="flex flex-col gap-3">
            {selected === null ? (
              <div className="flex h-72 items-center justify-center rounded-md border bg-muted/30 text-sm text-muted-foreground">
                Add a picture to get started.
              </div>
            ) : (
              <>
                <PicturePreview bytes={selected.data} mimeType={selected.mimeType} />
                <PictureForm
                  draft={selected}
                  onChangeKind={(kind) => updateDraft(selected.id, { kind })}
                  onChangeMimeType={(mimeType) => updateDraft(selected.id, { mimeType })}
                  onChangeDescription={(description) => updateDraft(selected.id, { description })}
                />
              </>
            )}
          </div>
        </section>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleAddClick}>
            Add…
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReplaceClick}
            disabled={selected === null}
          >
            Replace…
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportClick}
            disabled={selected === null}
          >
            Export…
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemoveClick}
            disabled={selected === null}
          >
            Remove
          </Button>
        </div>
        <input
          ref={addInputRef}
          type="file"
          accept={pictureAccept}
          multiple
          hidden
          onChange={handleAddFiles}
        />
        <input
          ref={replaceInputRef}
          type="file"
          accept={pictureAccept}
          hidden
          onChange={handleReplaceFile}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApplyClick} disabled={!dirty}>
            {dirty ? "Apply changes" : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
