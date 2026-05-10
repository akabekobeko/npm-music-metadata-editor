import { useLocale } from "@/features/i18n/useLocale";
import type { PictureDraft } from "@/features/pictures/types";
import { cn } from "@/libs/utils";

/** Props for {@link PictureList}. */
export type PictureListProps = {
  /** Picture drafts shown in the list, in display order. */
  readonly drafts: readonly PictureDraft[];
  /** Id of the currently-highlighted entry, or `null` for none. */
  readonly selectedId: string | null;
  /** Select a different entry in the list. */
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
 * Left-pane list of pictures inside the Pictures dialog.
 *
 * Each entry is a button so keyboard users can move through the list with
 * Tab + Enter. Selection style mirrors the spreadsheet's `bg-accent` accent
 * to reuse the existing visual language.
 *
 * @returns The list markup.
 */
export function PictureList({ drafts, selectedId, onSelect }: PictureListProps) {
  const { t } = useLocale();

  if (drafts.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        {t("pictures.none")}
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
            <span className="font-medium">{t(`pictures.kind.${draft.kind}`)}</span>
            <span className="text-muted-foreground">
              {draft.mimeType} · {formatSize(draft.data.byteLength)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
