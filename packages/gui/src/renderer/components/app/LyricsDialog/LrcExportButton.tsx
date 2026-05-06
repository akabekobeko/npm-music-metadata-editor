import { Button } from "@/components/ui/button";
import { formatLrc } from "@/features/lyrics/formatLrc";
import type { SyncedLine } from "@/features/lyrics/types";
import { basename } from "@/libs/basename";

/** Props for {@link LrcExportButton}. */
export type LrcExportButtonProps = {
  /** Suggested file name pre-filled into the save dialog. */
  readonly defaultName: string;
  /** Synchronized lines serialised into the LRC payload. */
  readonly lines: readonly SyncedLine[];
  /** Surface a user-facing error message (toast). */
  readonly onError: (message: string) => void;
  /** Surface a user-facing success message (toast). */
  readonly onSuccess: (message: string) => void;
};

/**
 * `Export LRC…` button.
 *
 * Pipes through `mme:dialog:saveFile` and `mme:file:writeBytes` rather than
 * driving an `<a download>` from Renderer, so the export path matches the
 * pictures dialog and produces an absolute on-disk path the user can open
 * from another tool.
 *
 * @returns The button markup.
 */
export function LrcExportButton({ defaultName, lines, onError, onSuccess }: LrcExportButtonProps) {
  const handleClick = async (): Promise<void> => {
    if (lines.length === 0) {
      onError("Nothing to export — add at least one synchronized line.");
      return;
    }

    const dialog = await window.mme.dialog.saveFile({
      defaultFileName: defaultName,
      filters: [{ name: "LRC", extensions: ["lrc"] }],
    });
    if (!dialog.ok) {
      onError(`Save dialog failed: ${dialog.error.message}`);
      return;
    }

    if (dialog.value === null) {
      return;
    }

    const text = formatLrc(lines);
    const bytes = new TextEncoder().encode(text);
    const write = await window.mme.file.writeBytes({
      filePath: dialog.value.filePath,
      bytes,
    });
    if (!write.ok) {
      onError(`Export failed: ${write.error.message}`);
      return;
    }

    onSuccess(`Exported lyrics to ${basename(dialog.value.filePath)}`);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleClick}>
      Export LRC…
    </Button>
  );
}
