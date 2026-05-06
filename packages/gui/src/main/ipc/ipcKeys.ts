/**
 * Channel name constants used by `ipcMain.handle` / `ipcRenderer.invoke`.
 *
 * Centralised here so Main and Preload reference the same string literals; if
 * a name needs to change, the type-checker forces every call site to follow.
 *
 * The `mme:<resource>:<verb>` shape mirrors the Phase 2 plan and keeps the
 * names self-describing in DevTools network traces.
 */
export const IpcKeys = {
  GetVersions: "mme:app:getVersions",
  ShowOpenFiles: "mme:dialog:openFiles",
  ShowSaveFile: "mme:dialog:saveFile",
  LoadTrack: "mme:track:load",
  LoadMany: "mme:track:loadMany",
  SaveTrack: "mme:track:save",
  ReadBytes: "mme:file:readBytes",
  WriteBytes: "mme:file:writeBytes",
  ListFormatSupport: "mme:formatSupport:list",
  GetSettings: "mme:settings:get",
  SetSettings: "mme:settings:set",
  ProgressSave: "mme:progress:save",
  /** Renderer → Main: expand dropped file/folder paths into audio paths. */
  ExpandPaths: "mme:dialog:expandPaths",
  /** Renderer → Main: forward a Renderer log entry into the Main-side log. */
  LogForward: "mme:log:forward",
  /** Renderer → Main: refresh the Electron application menu from a state snapshot. */
  MenuSetState: "mme:menu:setState",
  /** Main → Renderer: a native menu item was activated. */
  MenuAction: "mme:menu:action",
  /** Main → Renderer: an unhandled exception was caught on the Main side. */
  Fatal: "mme:fatal",
  /** Renderer → Main: report a Renderer-side fatal so it lands in the Main log. */
  FatalReport: "mme:fatal:report",
} as const;

/** Union of every channel name declared in {@link IpcKeys}. */
export type IpcKey = (typeof IpcKeys)[keyof typeof IpcKeys];
