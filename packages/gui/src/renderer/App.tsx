import { AppShell } from "./components/app/AppShell/AppShell";
import { SettingsProvider } from "./features/settings/store";

/**
 * Renderer entry component.
 *
 * Wraps the application shell with the settings context so any descendant
 * (Header, Spreadsheet, dialogs) can call `useSettings()` without further
 * plumbing. Effects that need the persisted snapshot (column widths, recent
 * files) live inside the shell.
 *
 * @returns The rendered application.
 */
function App() {
  return (
    <SettingsProvider>
      <AppShell />
    </SettingsProvider>
  );
}

export default App;
