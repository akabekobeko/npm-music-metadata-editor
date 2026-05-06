import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TrackRow } from "@/features/tracks/types";
import { basename } from "@/libs/basename";

/** Props for {@link FileNameCell}. */
export type FileNameCellProps = {
  /** Row whose file path is rendered in the cell. */
  readonly row: TrackRow;
};

/**
 * Pinned cell rendering the file's basename, with the absolute path in a
 * tooltip so users can disambiguate same-name tracks across folders.
 *
 * Dirty rows are flagged with a leading bullet (matches the Mp3tag /
 * VS Code unsaved-tab convention). Rows with a sticky `saveError` from the
 * previous Save All run get a red `!` marker plus the error message in the
 * tooltip — this is intentionally distinct from the dirty bullet so users can
 * triage failed-vs-pending rows at a glance.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function FileNameCell({ row }: FileNameCellProps) {
  const tooltipText =
    row.saveError === undefined
      ? row.filePath
      : `${row.filePath}\nSave failed: ${row.saveError.message}`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="block truncate text-left font-medium">
            {row.saveError !== undefined ? (
              <span role="img" aria-label="save failed" className="mr-1 font-bold text-destructive">
                !
              </span>
            ) : row.dirty ? (
              <span role="img" aria-label="unsaved changes">
                {"• "}
              </span>
            ) : null}
            {basename(row.filePath)}
          </span>
        }
      />
      <TooltipContent className="whitespace-pre-line">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
