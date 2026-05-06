import type { TagData } from "@mme/ipc";
import {
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { validateTagValue } from "@/features/edit/validators";

/** Args for {@link useEditableCell}. */
type Args = {
  /** `TagData` field the cell is bound to. */
  readonly field: keyof TagData;
  /** Initial editor value (may differ from the cell's current value when the
   * user typed a printable key to enter edit mode). */
  readonly initialValue: string;
  /** Called with the parsed value when validation succeeds. */
  readonly onCommit: (value: string | number | undefined) => void;
  /** Called when the user cancels with `Esc` or focus leaves without commit. */
  readonly onCancel: () => void;
};

/** Public surface returned by {@link useEditableCell}. */
export type EditableCellState = {
  /** Ref attached to the `<input>` so we can focus + select on mount. */
  readonly inputRef: RefObject<HTMLInputElement | null>;
  /** Live editor value, mirrored from the input's `onChange`. */
  readonly value: string;
  /** Validation error from the most recent commit attempt, or `null`. */
  readonly errorMessage: string | null;
  /** `onKeyDown` handler — handles Enter (commit) and Escape (cancel). */
  readonly handleKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** `onChange` handler — stores the live text and clears stale errors. */
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

/**
 * Owns every piece of state and side-effect the {@link EditableCell}
 * component needs.
 *
 * Validates locally on `Enter` so the parent never receives an invalid
 * value: failures keep the editor open and surface a tooltip-style message
 * via the input's `title` attribute. `Esc` cancels without dispatching, and
 * blur is treated as cancel by the component (matching Excel-style "click
 * elsewhere → discard" expectations).
 *
 * @param args - Component props passed straight through.
 * @returns The view-model the component renders against.
 */
export const useEditableCell = ({
  field,
  initialValue,
  onCommit,
  onCancel,
}: Args): EditableCellState => {
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

  return { inputRef, value, errorMessage, handleKeyDown, handleChange };
};
