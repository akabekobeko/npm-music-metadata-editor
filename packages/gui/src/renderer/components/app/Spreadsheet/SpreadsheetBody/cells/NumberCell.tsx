import { cn } from "@/libs/utils";

/** Props for {@link NumberCell}. */
export type NumberCellProps = {
  /** Numeric value or its stringified form to display. */
  readonly value: string | number | undefined;
  /** Render the cell muted to signal the field cannot be edited for this row. */
  readonly disabled?: boolean;
};

/**
 * Renders a numeric value, right-aligned to ease scanning columns of integers
 * (year / track number / BPM).
 *
 * Read-only view — inline editing is handled by `EditableCell` (with
 * `inputKind: "number"`) when the cell enters edit mode.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function NumberCell({ value, disabled }: NumberCellProps) {
  const text = value === undefined ? "" : String(value);
  return (
    <span
      className={cn(
        "block truncate text-right tabular-nums",
        disabled && "text-muted-foreground",
      )}
    >
      {text}
    </span>
  );
}
