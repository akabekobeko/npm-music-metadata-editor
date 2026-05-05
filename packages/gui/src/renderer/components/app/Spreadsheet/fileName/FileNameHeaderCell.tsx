/** Props for {@link FileNameHeaderCell}. */
export type FileNameHeaderCellProps = {
  readonly fileCount: number;
};

/**
 * Header cell for the pinned `fileName` column.
 *
 * Shows the column title alongside the number of currently-loaded rows so the
 * user always sees how big the working set is, even when scrolled deep into
 * the grid.
 *
 * @param props - Cell props.
 * @returns The header cell content.
 */
export function FileNameHeaderCell({ fileCount }: FileNameHeaderCellProps) {
  const suffix = fileCount === 1 ? "file" : "files";
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-medium">File</span>
      <span className="text-muted-foreground">
        ({fileCount} {suffix})
      </span>
    </div>
  );
}
