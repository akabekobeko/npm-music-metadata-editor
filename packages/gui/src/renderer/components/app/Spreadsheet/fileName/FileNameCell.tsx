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
 * @param props - Cell props.
 * @returns The cell content.
 */
export function FileNameCell({ row }: FileNameCellProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="block truncate text-left font-medium">{basename(row.filePath)}</span>
        }
      />
      <TooltipContent>{row.filePath}</TooltipContent>
    </Tooltip>
  );
}
