import { AppShell } from "./components/app/AppShell";

/**
 * Renderer entry component.
 *
 * Phase 3 reduces `App` to a thin wrapper over the application shell so the
 * shell itself can own state and effects without dragging React-tree noise
 * along with it.
 *
 * @returns The rendered application.
 */
function App() {
  return <AppShell />;
}

export default App;
