import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n/useLocale";

/** Props for {@link EmptyState}. */
export type EmptyStateProps = {
  readonly onOpenFiles: () => void;
};

/**
 * Initial view shown when no audio files are loaded.
 *
 * Mirrors the Header's "Open" entry point so the user has an obvious place to
 * start, even before they discover the menu / shortcut.
 *
 * @param props - Component props.
 * @returns The empty-state surface.
 */
export function EmptyState({ onOpenFiles }: EmptyStateProps) {
  const { t } = useLocale();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <FolderOpen className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <p className="text-base font-medium">{t("empty.title")}</p>
        <p className="text-sm text-muted-foreground">{t("empty.description")}</p>
      </div>
      <Button onClick={onOpenFiles}>
        <FolderOpen />
        {t("header.openFiles")}
      </Button>
    </div>
  );
}
