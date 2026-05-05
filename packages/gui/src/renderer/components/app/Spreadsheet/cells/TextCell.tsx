import { cn } from "@/libs/utils";

/** Props for {@link TextCell}. */
export type TextCellProps = {
  readonly value: string | number | undefined;
  readonly disabled?: boolean;
};

/**
 * Renders a free-form text or numeric value as a single-line, ellipsized cell.
 *
 * Used for `tag.<field>` columns whose `inputKind` is `"text"`. Empty / undefined
 * values render as a blank cell (no em-dash) so unset fields look quiet rather
 * than missing.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function TextCell({ value, disabled }: TextCellProps) {
  const text = value === undefined ? "" : String(value);
  return (
    <span
      className={cn("block truncate", disabled && "text-muted-foreground/60")}
      title={text === "" ? undefined : text}
    >
      {text}
    </span>
  );
}
