import { useCallback, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PICTURE_FILE_EXTENSIONS, PICTURE_SIZE_WARNING_BYTES } from "@/features/pictures/constants";
import { draftsToPictureInfos, pictureInfosToDrafts } from "@/features/pictures/draftConversions";
import { extensionForMime } from "@/features/pictures/extensionForMime";
import { fileToPicture } from "@/features/pictures/fileToPicture";
import type { PictureDraft } from "@/features/pictures/types";
import { basename } from "@/libs/basename";
import type { PictureInfo } from "../../../../main/ipc/types";

import { PictureForm } from "./PictureForm";
import { PictureList } from "./PictureList";
import { PicturePreview } from "./PicturePreview";

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
 * Sort pictures by kind ascending, breaking ties by insertion order.
 *
 * The list is presented in kind-ascending order; we sort a shallow copy so
 * the original draft state retains its mutation order (used by `selectedId`
 * lookups).
 *
 * @param drafts - Draft list.
 * @returns A new array sorted by kind.
 */
const sortByKind = (drafts: readonly PictureDraft[]): readonly PictureDraft[] =>
  [...drafts].sort((a, b) => a.kind - b.kind);

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
  const initialDrafts = useMemo(() => pictureInfosToDrafts(initialPictures), [initialPictures]);
  const [drafts, setDrafts] = useState<readonly PictureDraft[]>(initialDrafts);
  const [selectedId, setSelectedId] = useState<string | null>(initialDrafts[0]?.id ?? null);
  const [dragActive, setDragActive] = useState(false);
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const selected = drafts.find((draft) => draft.id === selectedId) ?? null;
  const sortedDrafts = useMemo(() => sortByKind(drafts), [drafts]);
  const dirty = useMemo(() => !equalDraftLists(drafts, initialDrafts), [drafts, initialDrafts]);

  const updateDraft = useCallback((id: string, patch: Partial<PictureDraft>): void => {
    setDrafts((prev) => prev.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }, []);

  const ingestFiles = useCallback(
    async (files: FileList | readonly File[]): Promise<void> => {
      const list = Array.from(files);
      if (list.length === 0) {
        return;
      }

      const next = await Promise.all(list.map((file) => fileToPicture(file)));
      setDrafts((prev) => [...prev, ...next]);
      const last = next[next.length - 1];
      if (last !== undefined) {
        setSelectedId(last.id);
      }

      const oversize = next.find((draft) => draft.data.byteLength >= PICTURE_SIZE_WARNING_BYTES);
      if (oversize !== undefined) {
        onNotify("Added picture exceeds 5 MiB — embedding will inflate tag size.");
      }
    },
    [onNotify],
  );

  const handleAddClick = useCallback((): void => {
    addInputRef.current?.click();
  }, []);

  const handleReplaceClick = useCallback((): void => {
    replaceInputRef.current?.click();
  }, []);

  const handleAddFiles = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const files = event.target.files;
      if (files !== null) {
        await ingestFiles(files);
      }

      event.target.value = "";
    },
    [ingestFiles],
  );

  const handleReplaceFile = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (selected === null || file === undefined) {
        return;
      }

      const replacement = await fileToPicture(file);
      updateDraft(selected.id, {
        mimeType: replacement.mimeType,
        data: replacement.data,
      });
      if (replacement.data.byteLength >= PICTURE_SIZE_WARNING_BYTES) {
        onNotify("Replacement picture exceeds 5 MiB — embedding will inflate tag size.");
      }
    },
    [selected, updateDraft, onNotify],
  );

  const handleExportClick = useCallback(async (): Promise<void> => {
    if (selected === null) {
      return;
    }

    const ext = extensionForMime(selected.mimeType);
    const baseName = basename(filePath).replace(/\.[^.]+$/, "");
    const dialog = await window.mme.dialog.saveFile({
      defaultFileName: `${baseName}-${selected.kind}.${ext}`,
      filters: [{ name: "Image", extensions: [ext] }],
    });
    if (!dialog.ok) {
      onNotify(`Save dialog failed: ${dialog.error.message}`);
      return;
    }

    if (dialog.value === null) {
      return;
    }

    const write = await window.mme.file.writeBytes({
      filePath: dialog.value.filePath,
      bytes: selected.data,
    });
    if (!write.ok) {
      onNotify(`Export failed: ${write.error.message}`);
      return;
    }

    onNotify(`Exported picture to ${basename(dialog.value.filePath)}`);
  }, [filePath, selected, onNotify]);

  const handleRemoveClick = useCallback((): void => {
    if (selected === null) {
      return;
    }

    setDrafts((prev) => prev.filter((draft) => draft.id !== selected.id));
    setSelectedId((prev) => (prev === selected.id ? null : prev));
  }, [selected]);

  const handleApplyClick = useCallback((): void => {
    onApply(draftsToPictureInfos(drafts));
  }, [drafts, onApply]);

  const handleDragEnter = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>): Promise<void> => {
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files).filter(isImageFile);
      await ingestFiles(files);
    },
    [ingestFiles],
  );

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

/** `accept` attribute matching the project-wide picture extensions. */
const pictureAccept = PICTURE_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

/**
 * Decide whether a file dropped onto the dialog should be ingested.
 *
 * Filters by MIME type prefix (`image/`) and extension to avoid pulling in
 * arbitrary binary blobs. The plan does not require deeper validation —
 * `fileToPicture` already runs magic-number sniffing on the bytes.
 *
 * @param file - Dropped browser `File`.
 * @returns `true` when the file looks like an image.
 */
const isImageFile = (file: File): boolean => {
  if (file.type !== "" && file.type.startsWith("image/")) {
    return true;
  }

  const dot = file.name.lastIndexOf(".");
  if (dot < 0) {
    return false;
  }

  const ext = file.name.slice(dot + 1).toLowerCase();
  return PICTURE_FILE_EXTENSIONS.includes(ext);
};

/**
 * Compare two draft lists for "Apply enabled?" purposes.
 *
 * Mirrors the picture-equality logic in `isTrackDirty` (length plus per-entry
 * `kind` / `mimeType` / `description` / byte length) but keeps draft IDs out
 * of the comparison so that a freshly ingested file with the same shape as
 * an existing entry counts as "no change".
 *
 * @param a - First draft list.
 * @param b - Second draft list.
 * @returns `true` when both lists carry equivalent pictures.
 */
const equalDraftLists = (a: readonly PictureDraft[], b: readonly PictureDraft[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((draft, index) => {
    const other = b[index];
    if (other === undefined) {
      return false;
    }

    return (
      draft.kind === other.kind &&
      draft.mimeType === other.mimeType &&
      draft.description === other.description &&
      draft.data.byteLength === other.data.byteLength &&
      draft.data === other.data
    );
  });
};
