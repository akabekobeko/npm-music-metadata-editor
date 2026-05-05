import { FolderOpen } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Props for {@link Header}. */
export type HeaderProps = {
  readonly fileCount: number;
  readonly loading: boolean;
  readonly onOpenFiles: () => void;
};

/**
 * Top-level toolbar with the File → Open entry point and the file counter.
 *
 * Phase 3 keeps this as a single-row toolbar; later phases will grow column
 * settings and save controls into it.
 *
 * @param props - Component props.
 * @returns The toolbar.
 */
export function Header({ fileCount, loading, onOpenFiles }: HeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b bg-background px-3">
      <h1 className="font-heading text-base font-semibold">Music Metadata Editor</h1>
      <Button variant="outline" size="sm" onClick={onOpenFiles} disabled={loading}>
        <FolderOpen />
        Open Audio Files…
      </Button>
      <div className="ml-auto text-sm text-muted-foreground tabular-nums">
        {loading ? "Loading…" : `${fileCount} ${fileCount === 1 ? "file" : "files"}`}
      </div>
    </header>
  );
}
