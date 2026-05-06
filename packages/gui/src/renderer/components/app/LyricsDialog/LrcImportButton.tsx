import { Button } from "@/components/ui/button";
import type { SyncedLine } from "@/features/lyrics/types";

import { useLrcImportButton } from "./useLrcImportButton.js";

/** Props for {@link LrcImportButton}. */
export type LrcImportButtonProps = {
  /** Receive the synchronized lines parsed from the chosen file. */
  readonly onImport: (lines: readonly SyncedLine[]) => void;
  /** Surface a user-facing error message (toast). */
  readonly onError: (message: string) => void;
};

/**
 * `+ Import LRC…` button.
 *
 * Uses a hidden `<input type="file">` so the click triggers the system file
 * dialog without needing the Main-side file dialog (the user is picking a
 * Renderer-side resource here, not editing the music file). The selected
 * file is read with `File.text()` and run through {@link parseLrc}; only
 * the synchronized lines flow back to the parent.
 *
 * @returns The button markup plus the hidden input.
 */
export function LrcImportButton({ onImport, onError }: LrcImportButtonProps) {
  const { inputRef, handleClick, handleChange } = useLrcImportButton({ onImport, onError });

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleClick}>
        Import LRC…
      </Button>
      <input ref={inputRef} type="file" accept=".lrc,text/plain" hidden onChange={handleChange} />
    </>
  );
}
