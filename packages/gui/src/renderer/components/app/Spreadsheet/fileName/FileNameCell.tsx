import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { TrackRow } from "@/features/tracks/types";
import { basename } from "@/libs/basename";

/** Props for {@link FileNameCell}. */
export type FileNameCellProps = {
  readonly row: TrackRow;
};

/**
 * Pinned cell rendering the file's basename, with the absolute path in a
 * tooltip so users can disambiguate same-name tracks across folders.
 *
 * Dirty rows are flagged with a leading bullet (matches the Mp3tag /
 * VS Code unsaved-tab convention) so users can scan the column for pending
 * edits without opening every cell.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function FileNameCell({ row }: FileNameCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="block truncate text-left font-medium">
            {row.dirty ? (
              <span role="img" aria-label="unsaved changes">
                {"• "}
              </span>
            ) : null}
            {basename(row.filePath)}
          </span>
        }
      />
      <TooltipContent>{row.filePath}</TooltipContent>
    </Tooltip>
  );
}
