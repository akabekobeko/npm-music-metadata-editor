import type { ReactNode } from "react";

import type { ColumnDefinition } from "@/features/spreadsheet/types";

type Args = {
  /** Column definition currently being rendered. */
  readonly column: ColumnDefinition;
};

/**
 * Render a column header.
 *
 * Every column simply renders its title; per-cell write eligibility is
 * conveyed in the body via the disabled cell styling rather than in the
 * header.
 *
 * @returns The header content.
 */
export const renderHeader = ({ column }: Args): ReactNode => (
  <span className="font-medium">{column.title}</span>
);
