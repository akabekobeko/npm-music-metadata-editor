import { type ChangeEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import { validateTagValue } from "@/features/edit/validators";
import type { InputKind } from "@/features/spreadsheet/types";
import { cn } from "@/libs/utils";
import type { TagData } from "../../../../../main/ipc/types";

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
 * dispatching, and blur is treated as cancel to match Excel-style "click
 * elsewhere → discard" expectations.
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
  const [value, setValue] = useState(initialValue);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      const result = validateTagValue(field, value);
      if (result.ok) {
        setErrorMessage(null);
        onCommit(result.value);
        return;
      }

      setErrorMessage(result.message);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
    if (errorMessage !== null) {
      setErrorMessage(null);
    }
  };

  return (
    <input
      ref={inputRef}
      type={inputKind === "number" ? "number" : "text"}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
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
