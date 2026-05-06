import { TooltipProvider } from "@/components/ui/tooltip";

import { AboutDialog } from "../AboutDialog/AboutDialog";
import { FatalDialog } from "../FatalDialog/FatalDialog";
import { Spreadsheet } from "../Spreadsheet/Spreadsheet";
import { ActiveDialogs } from "./ActiveDialogs";
import { EmptyState } from "./EmptyState";
import { Header } from "./Header";
import { SavingDialog } from "./SavingDialog";
import { StatusBar } from "./StatusBar";
import { useAppShell } from "./useAppShell.js";

/**
 * Top-level shell composing the header, the spreadsheet (or empty state),
 * the status bar, and the load / edit / settings stores.
 *
 * All data plumbing and side-effects live in `useAppShell` (and the hooks it
 * composes); this component only consumes the resulting view model and
 * arranges JSX. Sibling concerns are colocated in the `AppShell/` directory:
 * sub-components (`Header`, `EmptyState`, `StatusBar`, `SavingDialog`,
 * `ActiveDialogs`) are private to AppShell, while `Spreadsheet` /
 * `PicturesDialog` / `LyricsDialog` remain in their own feature directories.
 *
 * @returns The composed application UI.
 */
export function AppShell() {
  const model = useAppShell();
  const { rows, columns, save, grid, dialogs, status } = model;
  const fileCount = rows.length;

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col">
        <Header
          fileCount={fileCount}
          dirtyCount={model.dirtyCount}
          loading={model.loading}
          saving={save.saving}
          visibleIds={columns.visibleIds}
          onOpenFiles={model.onOpenFiles}
          onToggleColumn={columns.toggleColumn}
          onSaveAll={save.saveAll}
          onDiscardChanges={save.discardChanges}
        />
        <main className="flex-1 overflow-hidden">
          {fileCount === 0 ? (
            <EmptyState onOpenFiles={model.onOpenFiles} />
          ) : (
            <Spreadsheet
              columns={columns.columns}
              rows={rows}
              support={model.support}
              columnWidths={columns.columnWidths}
              onOpenPictures={dialogs.openPictures}
              onOpenLyrics={dialogs.openLyrics}
              onCommit={grid.onCommit}
              onPaste={grid.onPaste}
              onUndo={grid.onUndo}
              onColumnResize={columns.resizeColumn}
            />
          )}
        </main>
        <StatusBar
          fileCount={fileCount}
          dirtyCount={model.dirtyCount}
          warningCount={model.warningCount}
          transient={status.transient}
        />
      </div>
      <ActiveDialogs state={dialogs} notify={status.show} />
      <SavingDialog
        open={save.saving}
        progress={save.progress}
        errorCount={save.errorCount}
        onCancel={save.cancelSave}
      />
      <AboutDialog open={model.aboutOpen} onClose={() => model.setAboutOpen(false)} />
      <FatalDialog
        fatal={model.fatal}
        onReload={model.onReloadFromFatal}
        onQuit={model.onQuitFromFatal}
      />
    </TooltipProvider>
  );
}
