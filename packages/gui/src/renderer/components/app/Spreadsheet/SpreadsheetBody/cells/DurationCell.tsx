/** Props for {@link DurationCell}. */
export type DurationCellProps = {
  /** Pre-formatted duration string from the column registry. */
  readonly value: string | number | undefined;
};

/**
 * Renders a pre-formatted duration (`m:ss` / `h:mm:ss`) right-aligned.
 *
 * The value is expected to come from `formatDuration(durationMs)`, which the
 * column registry already calls inside `readValue`. This cell only handles the
 * presentation.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function DurationCell({ value }: DurationCellProps) {
  const text = value === undefined ? "" : String(value);
  return (
    <span className="block truncate text-right tabular-nums text-muted-foreground">{text}</span>
  );
}
