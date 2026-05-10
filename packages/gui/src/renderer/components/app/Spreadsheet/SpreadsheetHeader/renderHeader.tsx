import type { ReactNode } from "react";

import type { ColumnDefinition } from "@/features/spreadsheet/types";
import type { TrackRow } from "@/features/tracks/types";

import { FileNameHeaderCell } from "./FileNameHeaderCell";

type Args = {
  /** Column definition currently being rendered. */
  readonly column: ColumnDefinition;
  /** Open spreadsheet rows. */
  readonly rows: readonly TrackRow[];
};

/**
 * Render a column header.
 *
 * The pinned `fileName` column has a dedicated header showing the file count;
 * every other column simply renders its title. Per-cell write eligibility is
 * conveyed in the body via the disabled cell styling rather than in the
 * header.
 *
 * @returns The header content.
 */
export const renderHeader = ({ column, rows }: Args): ReactNode => {
  if (column.id === "fileName") {
    return <FileNameHeaderCell fileCount={rows.length} />;
  }

  return <span className="font-medium">{column.title}</span>;
};
