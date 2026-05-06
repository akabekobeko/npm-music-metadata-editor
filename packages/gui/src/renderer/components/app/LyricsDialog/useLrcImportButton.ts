import { type ChangeEvent, type RefObject, useRef } from "react";

import { parseLrc } from "@/features/lyrics/parseLrc";
import type { SyncedLine } from "@/features/lyrics/types";

/** Args for {@link useLrcImportButton}. */
type Args = {
  /** Receive the synchronized lines parsed from the chosen file. */
  readonly onImport: (lines: readonly SyncedLine[]) => void;
  /** Surface a user-facing error message (toast). */
  readonly onError: (message: string) => void;
};

/** Public surface returned by {@link useLrcImportButton}. */
export type LrcImportButtonState = {
  /** Ref attached to the hidden `<input type="file">`. */
  readonly inputRef: RefObject<HTMLInputElement | null>;
  /** Click handler for the visible button — opens the OS file picker. */
  readonly handleClick: () => void;
  /** Change handler for the hidden input — reads + parses the file. */
  readonly handleChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
};

/**
 * Owns the small piece of state the {@link LrcImportButton} component needs.
 *
 * Wires the visible button to a hidden `<input type="file">` so the click
 * triggers the system file dialog without going through Main IPC (the user
 * is picking a Renderer-side resource here, not editing the music file).
 * The selected file is read with `File.text()` and parsed via
 * {@link parseLrc}; only the synchronized lines flow back to the parent.
 *
 * @param args - Component props passed straight through.
 * @returns The view-model the component renders against.
 */
export const useLrcImportButton = ({ onImport, onError }: Args): LrcImportButtonState => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = (): void => {
    inputRef.current?.click();
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file === undefined) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseLrc(text);
      onImport(parsed.lines);
    } catch (error) {
      onError(error instanceof Error ? error.message : String(error));
    }
  };

  return { inputRef, handleClick, handleChange };
};
