/** Props for {@link DisabledCell}. */
export type DisabledCellProps = {
  /** Raw value to display; rendered as `"—"` when `undefined` or empty. */
  readonly value: string | number | undefined;
};

/**
 * Cell renderer for fields the row's audio format cannot persist.
 *
 * The value is still shown (e.g. WAV files might surface a picture count even
 * though they cannot write pictures), but the styling clearly signals that
 * editing / pasting is disallowed.
 *
 * @param props - Cell props.
 * @returns The cell content.
 */
export function DisabledCell({ value }: DisabledCellProps) {
  const text = value === undefined || value === "" ? "—" : String(value);
  return (
    <span
      className="block truncate text-muted-foreground/60 italic"
      title="This field is not supported by the file format."
    >
      {text}
    </span>
  );
}
