import type { PictureInfo } from "@mme/ipc";
import { type ChangeEvent, type DragEvent, useCallback, useMemo, useRef, useState } from "react";
import { useLocale } from "@/features/i18n/useLocale";
import { PICTURE_FILE_EXTENSIONS, PICTURE_SIZE_WARNING_BYTES } from "@/features/pictures/constants";
import { draftsToPictureInfos, pictureInfosToDrafts } from "@/features/pictures/draftConversions";
import { extensionForMime } from "@/features/pictures/extensionForMime";
import { fileToPicture } from "@/features/pictures/fileToPicture";
import type { PictureDraft } from "@/features/pictures/types";
import { basename } from "@/libs/basename";

/** Args for {@link usePicturesDialog}. */
type Args = {
  /** Absolute path of the row being edited; used as the title's subtitle. */
  readonly filePath: string;
  /** Picture set to seed the dialog with. */
  readonly initialPictures: readonly PictureInfo[];
  /** Commit the edited picture set back to the edit store. */
  readonly onApply: (pictures: readonly PictureInfo[]) => void;
  /** Surface a transient status message (toast). */
  readonly onNotify: (message: string) => void;
};

/** Public surface returned by {@link usePicturesDialog}. */
export type PicturesDialogState = {
  /** Drafts sorted by `kind` for display. */
  readonly sortedDrafts: readonly PictureDraft[];
  /** Currently selected draft, or `null` when nothing is selected. */
  readonly selected: PictureDraft | null;
  /** Identifier of the selected draft, mirrored for the list highlight. */
  readonly selectedId: string | null;
  /** Update the selection in response to list clicks. */
  readonly setSelectedId: (id: string | null) => void;
  /** Whether the draft list differs from the initial state. */
  readonly dirty: boolean;
  /** Whether a drag-and-drop session is currently hovering the dialog. */
  readonly dragActive: boolean;
  /** Ref attached to the hidden `<input type="file">` for adds. */
  readonly addInputRef: React.RefObject<HTMLInputElement | null>;
  /** Ref attached to the hidden `<input type="file">` for replacements. */
  readonly replaceInputRef: React.RefObject<HTMLInputElement | null>;
  /** Patch a draft's editable fields (kind / mimeType / description). */
  readonly updateDraft: (id: string, patch: Partial<PictureDraft>) => void;
  /** Open the OS picker for the add flow. */
  readonly handleAddClick: () => void;
  /** Open the OS picker for the replace flow. */
  readonly handleReplaceClick: () => void;
  /** Ingest files chosen via the add picker. */
  readonly handleAddFiles: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Ingest the file chosen via the replace picker. */
  readonly handleReplaceFile: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  /** Save the selected draft's bytes to disk via the IPC dialog + write pair. */
  readonly handleExportClick: () => Promise<void>;
  /** Remove the selected draft from the list. */
  readonly handleRemoveClick: () => void;
  /** Commit the current draft list back to the host. */
  readonly handleApplyClick: () => void;
  /** Drag-enter handler — flips the overlay on. */
  readonly handleDragEnter: (event: DragEvent<HTMLDivElement>) => void;
  /** Drag-leave handler — flips the overlay off. */
  readonly handleDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  /** Drag-over handler — required to enable drop. */
  readonly handleDragOver: (event: DragEvent<HTMLDivElement>) => void;
  /** Drop handler — filters images, then ingests. */
  readonly handleDrop: (event: DragEvent<HTMLDivElement>) => Promise<void>;
  /** Pre-computed `accept` attribute for both hidden file inputs. */
  readonly pictureAccept: string;
};

/** `accept` attribute matching the project-wide picture extensions. */
const pictureAccept = PICTURE_FILE_EXTENSIONS.map((ext) => `.${ext}`).join(",");

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

/**
 * Owns every piece of state and side-effect the {@link PicturesDialog}
 * component needs.
 *
 * Manages the local draft list, selection, drag-and-drop overlay, and the
 * hidden file inputs that drive the Add / Replace flow. The Export flow
 * defers to the `mme:dialog:saveFile` + `mme:file:writeBytes` IPC pair so
 * Renderer never touches Node `fs` directly.
 *
 * @param args - Component props passed straight through.
 * @returns The view-model the component renders against.
 */
export const usePicturesDialog = ({
  filePath,
  initialPictures,
  onApply,
  onNotify,
}: Args): PicturesDialogState => {
  const { t } = useLocale();
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
        onNotify(t("pictures.notify.oversizeAdded"));
      }
    },
    [onNotify, t],
  );

  const handleAddClick = useCallback((): void => {
    addInputRef.current?.click();
  }, []);

  const handleReplaceClick = useCallback((): void => {
    replaceInputRef.current?.click();
  }, []);

  const handleAddFiles = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
      const files = event.target.files;
      if (files !== null) {
        await ingestFiles(files);
      }

      event.target.value = "";
    },
    [ingestFiles],
  );

  const handleReplaceFile = useCallback(
    async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
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
        onNotify(t("pictures.notify.oversizeReplaced"));
      }
    },
    [selected, updateDraft, onNotify, t],
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
      onNotify(t("pictures.notify.saveDialogFailed", { message: dialog.error.message }));
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
      onNotify(t("pictures.notify.exportFailed", { message: write.error.message }));
      return;
    }

    onNotify(t("pictures.notify.exportedTo", { fileName: basename(dialog.value.filePath) }));
  }, [filePath, selected, onNotify, t]);

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

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback(
    async (event: DragEvent<HTMLDivElement>): Promise<void> => {
      event.preventDefault();
      setDragActive(false);
      const files = Array.from(event.dataTransfer.files).filter(isImageFile);
      await ingestFiles(files);
    },
    [ingestFiles],
  );

  return {
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
  };
};
