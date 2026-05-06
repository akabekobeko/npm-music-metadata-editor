import type { ReactNode } from "react";

import type { ColumnDefinition } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import { DurationCell } from "./cells/DurationCell";
import { FileNameCell } from "./cells/FileNameCell";
import { LyricsSummaryCell } from "./cells/LyricsSummaryCell";
import { NumberCell } from "./cells/NumberCell";
import { PicturesSummaryCell } from "./cells/PicturesSummaryCell";
import { TextCell } from "./cells/TextCell";
import { WarningsCell } from "./cells/WarningsCell";

/** Handlers for cells that delegate user intent back to the page (modal opens). */
export type CellHandlers = {
  /** Open the picture-management dialog for the given row. */
  readonly onOpenPictures: (row: TrackRow) => void;
  /** Open the lyrics editor dialog for the given row. */
  readonly onOpenLyrics: (row: TrackRow) => void;
};

type Args = {
  /** The column definition currently being rendered. */
  readonly column: ColumnDefinition;
  /** The track row owning the cell. */
  readonly row: TrackRow;
  /** Result of `isCellWritable({ row, columnId, support })`. */
  readonly cellWritable: boolean;
  /** Callbacks invoked from clickable cells (Pictures / Lyrics). */
  readonly handlers: CellHandlers;
};

/**
 * Pick the cell renderer matching the column id and editability.
 *
 * Centralizing the dispatch here keeps the spreadsheet body free of per-column
 * branching: callers always invoke `renderCell({ column, row, ... })`
 * regardless of the column's flavour.
 *
 * @returns The cell renderer to insert into the table body.
 */
export const renderCell = ({ column, row, cellWritable, handlers }: Args): ReactNode => {
  if (column.id === "fileName") {
    return <FileNameCell row={row} />;
  }

  if (column.id === "warnings") {
    return <WarningsCell row={row} />;
  }

  if (column.id === "pictures") {
    return (
      <PicturesSummaryCell row={row} disabled={!cellWritable} onOpen={handlers.onOpenPictures} />
    );
  }

  if (column.id === "lyrics") {
    return <LyricsSummaryCell row={row} disabled={!cellWritable} onOpen={handlers.onOpenLyrics} />;
  }

  const value = column.readValue(row);
  if (column.id === "durationMs") {
    return <DurationCell value={value} />;
  }

  // tag.* and the remaining display-only columns (audioFormat / chapters)
  // share the plain text/number renderers; per-format disabling shows up as a
  // muted style without hiding the value.
  const disabled = column.editable !== "never" && !cellWritable;
  if (column.editable === "tag" && column.inputKind === "number") {
    return <NumberCell value={value} disabled={disabled} />;
  }

  return <TextCell value={value} disabled={disabled} />;
};
