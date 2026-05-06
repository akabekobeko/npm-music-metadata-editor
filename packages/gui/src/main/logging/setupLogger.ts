import electronLog from "electron-log/main";

/**
 * Configure `electron-log` so Main-side `console.*` writes to both stdout
 * (DevTools) and `<userData>/logs/main.log`.
 *
 * Calls `electron-log/main`'s `initialize` to enable Renderer log forwarding
 * via the package's bundled preload bridge (we still wire our own
 * `mme:log:forward` channel from `console.error` because we don't ship the
 * electron-log preload), then patches every `console.*` so legacy code keeps
 * working without import changes.
 *
 * The default file transport already enforces 1 MB rotation; we leave it
 * alone to match the Phase 7 plan.
 */
export const setupLogger = (): void => {
  electronLog.initialize();
  electronLog.transports.file.level = "info";
  electronLog.transports.console.level = "info";
  Object.assign(console, electronLog.functions);
};
