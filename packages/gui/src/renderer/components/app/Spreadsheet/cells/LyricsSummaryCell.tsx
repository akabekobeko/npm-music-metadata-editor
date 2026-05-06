import { FileText } from "lucide-react";

import { summarizeLyrics } from "@/features/tracks/summarizeLyrics";
import type { TrackRow } from "@/features/tracks/types";
import { cn } from "@/libs/utils";

/** Props for {@link LyricsSummaryCell}. */
export type LyricsSummaryCellProps = {
  /** Row whose lyrics are summarised. */
  readonly row: TrackRow;
  /** Render the cell muted and gate the double-click handler. */
  readonly disabled?: boolean;
  /** Open the lyrics editor for the row on double-click. */
  readonly onOpen: (row: TrackRow) => void;
};

/**
 * Cell summarizing the track's lyrics as `none` / `text` / `synced`.
 *
 * Double-click delegates to `onOpen`. Phase 3 surfaces a placeholder modal
 * notice; Phase 5 wires the real lyrics editor.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function LyricsSummaryCell({ row, disabled, onOpen }: LyricsSummaryCellProps) {
  const summary = summarizeLyrics(row.track.lyrics);
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
      <FileText className="size-3.5 shrink-0" />
      <span className="truncate">{text}</span>
    </button>
  );
}
