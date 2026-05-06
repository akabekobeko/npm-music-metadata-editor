import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { parseLrc } from "@/features/lyrics/parseLrc";
import type { SyncedLine } from "@/features/lyrics/types";

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
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleClick = (): void => {
    inputRef.current?.click();
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
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

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleClick}>
        Import LRC…
      </Button>
      <input ref={inputRef} type="file" accept=".lrc,text/plain" hidden onChange={handleChange} />
    </>
  );
}
