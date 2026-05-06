import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SaveProgress } from "@/features/save/types";
import { basename } from "@/libs/basename";

export type SavingDialogProps = {
  /** Mounted only while a Save All run is in flight. */
  readonly open: boolean;
  /** Latest progress event, or `null` before the first row starts. */
  readonly progress: SaveProgress | null;
  /** Number of failed rows seen so far. */
  readonly errorCount: number;
  /** Cancel handler — flips the loop's `isCancelled` flag. */
  readonly onCancel: () => void;
};

/**
 * Modal that masks the spreadsheet during a Save All run.
 *
 * Cancellation is "skip the next row, not interrupt the current write" — the
 * current `mme:track:save` always finishes to avoid leaving a half-written
 * file. The button stays enabled even after the user clicked it so they get
 * visual confirmation if they second-guess themselves.
 *
 * @param props - Component props.
 * @returns The dialog node.
 */
export function SavingDialog({ open, progress, errorCount, onCancel }: SavingDialogProps) {
  const total = progress?.total ?? 0;
  const current = progress?.current ?? 0;
  const ratio = total === 0 ? 0 : Math.min(1, current / total);
  const fileName = progress === null ? "" : basename(progress.filePath);

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>
            Saving {current} of {total}…
          </DialogTitle>
          <DialogDescription>{fileName === "" ? "Preparing to save…" : fileName}</DialogDescription>
        </DialogHeader>
        <div
          role="progressbar"
          aria-label="Save progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={current}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${Math.round(ratio * 100)}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">Errors so far: {errorCount}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
