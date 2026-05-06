import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale } from "@/features/i18n/useLocale";
import type { FatalPayload } from "../../../../main/ipc/types.js";

/** Props for {@link FatalDialog}. */
export type FatalDialogProps = {
  readonly fatal: FatalPayload | null;
  readonly onReload: () => void;
  readonly onQuit: () => void;
};

/**
 * Modal shown when Main reports an `uncaughtException` /
 * `unhandledRejection`, or when the Renderer's own `window.onerror` fires.
 *
 * Cannot be dismissed by clicking outside — the underlying state is by
 * definition unknown after a fatal, so the user must explicitly reload (=
 * recover) or quit (= give up).
 *
 * @param props - Component props.
 * @returns The modal node, or `null` when no fatal is active.
 */
export function FatalDialog({ fatal, onReload, onQuit }: FatalDialogProps) {
  const { t } = useLocale();
  const open = fatal !== null;

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("fatal.title")}</DialogTitle>
          <DialogDescription>{t("fatal.description")}</DialogDescription>
        </DialogHeader>
        {fatal !== null ? (
          <pre className="max-h-64 overflow-auto rounded bg-muted p-2 font-mono text-xs">
            {fatal.message}
            {fatal.stack !== undefined ? `\n\n${fatal.stack}` : ""}
          </pre>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onReload}>
            {t("fatal.reload")}
          </Button>
          <Button variant="destructive" onClick={onQuit}>
            {t("fatal.quit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
