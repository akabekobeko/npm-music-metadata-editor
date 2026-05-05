import { PICTURE_KIND_OPTIONS } from "@/features/pictures/constants";
import type { PictureDraft } from "@/features/pictures/types";
import { cn } from "@/libs/utils";

/** Props for {@link PictureList}. */
export type PictureListProps = {
  readonly drafts: readonly PictureDraft[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
};

/**
 * Format the draft's `data.byteLength` as a short human-readable string
 * (`"4 B"`, `"12 KiB"`, `"1.2 MiB"`).
 *
 * @param byteLength - Picture byte length.
 * @returns A short, locale-independent size label.
 */
const formatSize = (byteLength: number): string => {
  if (byteLength < 1024) {
    return `${byteLength} B`;
  }

  if (byteLength < 1024 * 1024) {
    return `${Math.round(byteLength / 1024)} KiB`;
  }

  return `${(byteLength / (1024 * 1024)).toFixed(1)} MiB`;
};

/**
 * Look up the label for a `PictureDraft.kind` value.
 *
 * @param kind - Numeric kind value from the draft.
 * @returns The user-facing label or the numeric value as a fallback.
 */
const labelForKind = (kind: PictureDraft["kind"]): string =>
  PICTURE_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? String(kind);

/**
 * Left-pane list of pictures inside the Pictures dialog.
 *
 * Each entry is a button so keyboard users can move through the list with
 * Tab + Enter. Selection style mirrors the spreadsheet's `bg-accent` accent
 * to reuse the existing visual language.
 *
 * @returns The list markup.
 */
export function PictureList({ drafts, selectedId, onSelect }: PictureListProps) {
  if (drafts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No pictures
      </div>
    );
  }

  return (
    <ul className="flex h-full flex-col gap-1 overflow-auto">
      {drafts.map((draft) => (
        <li key={draft.id}>
          <button
            type="button"
            onClick={() => onSelect(draft.id)}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 rounded-md border px-2 py-1.5 text-left text-xs",
              selectedId === draft.id
                ? "border-ring bg-accent text-accent-foreground"
                : "border-transparent hover:bg-muted",
            )}
          >
            <span className="font-medium">{labelForKind(draft.kind)}</span>
            <span className="text-muted-foreground">
              {draft.mimeType} · {formatSize(draft.data.byteLength)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
