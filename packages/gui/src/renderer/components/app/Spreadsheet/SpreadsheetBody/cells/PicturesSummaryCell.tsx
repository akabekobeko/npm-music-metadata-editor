import { ImageIcon } from "lucide-react";

import { summarizePictures } from "@/features/tracks/summarizePictures";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";

/** Props for {@link PicturesSummaryCell}. */
export type PicturesSummaryCellProps = {
  /** Row whose pictures are summarised. */
  readonly row: TrackRow;
  /** Render the cell muted and gate the double-click handler. */
  readonly disabled?: boolean;
  /** Open the pictures editor for the row on double-click. */
  readonly onOpen: (row: TrackRow) => void;
};

/**
 * Cell summarizing the track's embedded pictures.
 *
 * Shows the picture count with a "(cover)" hint when a Cover (front) is
 * present, and dispatches `onOpen` on double click. Phase 5 wires `onOpen` to
 * the picture editor dialog; Phase 3 calls a placeholder handler.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function PicturesSummaryCell({ row, disabled, onOpen }: PicturesSummaryCellProps) {
  const summary = summarizePictures(row.track.pictures);
  const text = summary.label ?? "—";
  return (
    <button
      type="button"
      onDoubleClick={() => onOpen(row)}
      disabled={disabled}
      className={cn(
        "flex w-full items-center gap-1.5 truncate text-left",
        disabled && "text-muted-foreground/60",
      )}
    >
      <ImageIcon className="size-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </button>
  );
}
