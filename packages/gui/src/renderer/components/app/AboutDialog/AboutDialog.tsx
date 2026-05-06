import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useAboutDialog } from "./useAboutDialog.js";

/** Props for {@link AboutDialog}. */
export type AboutDialogProps = {
  /** Whether the modal is currently mounted. */
  readonly open: boolean;
  /** Close handler — flips `open` back to `false`. */
  readonly onClose: () => void;
};

/**
 * About modal triggered by `Help → About` (and `<App> → About` on macOS).
 *
 * Loads the runtime stack versions from `mme:app:getVersions` on first open
 * and caches them for the lifetime of the dialog instance — version numbers
 * cannot change while the process is running.
 *
 * @param props - Component props.
 * @returns The modal node.
 */
export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const { t, versions } = useAboutDialog({ open });

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("about.title")}</DialogTitle>
          <DialogDescription>{t("about.license")}</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{t("about.version")}</dt>
          <dd className="font-mono">{versions?.gui ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("about.core")}</dt>
          <dd className="font-mono">{versions?.core ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("about.electron")}</dt>
          <dd className="font-mono">{versions?.electron ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("about.chrome")}</dt>
          <dd className="font-mono">{versions?.chrome ?? "—"}</dd>
          <dt className="text-muted-foreground">{t("about.node")}</dt>
          <dd className="font-mono">{versions?.node ?? "—"}</dd>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("about.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
