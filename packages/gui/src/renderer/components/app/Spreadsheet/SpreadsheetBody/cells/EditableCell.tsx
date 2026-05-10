import type { TagData } from "@mme/ipc";
import type { InputKind } from "@/features/spreadsheet/types";
import { cn } from "@/libs/utils";
import { useEditableCell } from "./useEditableCell.js";

/** Props for {@link EditableCell}. */
export type EditableCellProps = {
  /** `TagData` field the cell is bound to. */
  readonly field: keyof TagData;
  /** Editor flavour declared in the column registry. */
  readonly inputKind: InputKind;
  /** Initial editor value (may differ from the cell's current value when the
   * user typed a printable key to enter edit mode). */
  readonly initialValue: string;
  /** Called with the parsed value when validation succeeds. */
  readonly onCommit: (value: string | number | undefined) => void;
  /** Called when the user cancels with `Esc` or focus leaves without commit. */
  readonly onCancel: () => void;
};

/**
 * Inline cell editor used while a `tag.<field>` cell is being modified.
 *
 * The editor validates locally on `Enter` so the parent never receives an
 * invalid value: failures keep the editor open and surface a tooltip-style
 * message via the input's `title` attribute. `Esc` cancels without
 * dispatching. Blur commits when the current value is valid — matching
 * Excel / Numbers "click elsewhere → confirm" expectations — and discards
 * silently on validation failure so focus is free to leave the cell.
 *
 * @returns The editor markup.
 */
export function EditableCell({
  field,
  inputKind,
  initialValue,
  onCommit,
  onCancel,
}: EditableCellProps) {
  const { inputRef, value, errorMessage, handleKeyDown, handleChange, handleBlur } =
    useEditableCell({
      field,
      initialValue,
      onCommit,
      onCancel,
    });

  return (
    <input
      ref={inputRef}
      type={inputKind === "number" ? "number" : "text"}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      title={errorMessage ?? undefined}
      aria-invalid={errorMessage !== null}
      className={cn(
        "h-full w-full bg-background px-1 text-sm outline-none",
        "border-2 border-ring rounded-sm",
        errorMessage !== null && "border-destructive ring-1 ring-destructive",
      )}
    />
  );
}
