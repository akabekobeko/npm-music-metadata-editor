import { cn } from "@/libs/utils";

/** Props for {@link NumberCell}. */
export type NumberCellProps = {
  readonly value: string | number | undefined;
  readonly disabled?: boolean;
};

/**
 * Renders a numeric value, right-aligned to ease scanning columns of integers
 * (year / track number / BPM).
 *
 * Phase 4 will replace this with an inline `<Input type="number" />` editor;
 * Phase 3 keeps it display-only.
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
        disabled && "text-muted-foreground/60",
      )}
    >
      {text}
    </span>
  );
}
