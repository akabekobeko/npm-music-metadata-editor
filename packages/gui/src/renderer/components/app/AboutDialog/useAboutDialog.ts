import type { AppVersions } from "@mme/ipc";
import { useEffect, useState } from "react";
import { useLocale } from "@/features/i18n/useLocale";

/** Args for {@link useAboutDialog}. */
type Args = {
  /** Whether the modal is currently mounted. */
  readonly open: boolean;
};

/** Public surface returned by {@link useAboutDialog}. */
export type AboutDialogState = {
  /** Translator function bound to the user's locale. */
  readonly t: ReturnType<typeof useLocale>["t"];
  /** Cached runtime stack versions, or `null` until the IPC call resolves. */
  readonly versions: AppVersions | null;
};

/**
 * Owns the small piece of state the {@link AboutDialog} component needs.
 *
 * Loads the runtime stack versions from `mme:app:getVersions` on first open
 * and caches them for the lifetime of the dialog instance — version numbers
 * cannot change while the process is running. The fetch is cancellable so a
 * close-before-resolve does not call `setState` on an unmounted component.
 *
 * @param args - Component props passed straight through.
 * @returns The view-model the component renders against.
 */
export const useAboutDialog = ({ open }: Args): AboutDialogState => {
  const { t } = useLocale();
  const [versions, setVersions] = useState<AppVersions | null>(null);

  useEffect(() => {
    if (!open || versions !== null) {
      return;
    }

    let cancelled = false;
    void window.mme.app.getVersions().then((result) => {
      if (!cancelled) {
        setVersions(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, versions]);

  return { t, versions };
};
