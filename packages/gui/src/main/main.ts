import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow } from "electron";
import { setupFatalHandlers } from "./fatal/setupFatalHandlers.js";
import { initializeIpcEvents, releaseIpcEvents } from "./ipc/ipcHandler.js";
import { IpcKeys } from "./ipc/ipcKeys.js";
import type { MenuActionPayload, MenuStateSnapshot } from "./ipc/types.js";
import { resolveLocale } from "./locales/resolveLocale.js";
import { setupLogger } from "./logging/setupLogger.js";
import { initializeMenuController, releaseMenuController } from "./menu/menuController.js";
import { getSettings, initializeSettings, releaseSettings } from "./settings/settings.js";

/**
 * GitHub repository URL surfaced under `Help → Visit Project Website`.
 *
 * Hard-coded rather than read from `package.json` because the menu wiring
 * runs before any IPC is hot, and the URL is static across releases.
 */
const PROJECT_WEBSITE_URL = "https://github.com/akabekobeko/npm-music-metadata-editor";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Holds the BrowserWindow created in `whenReady` so menu / fatal handlers
 * can target it without re-querying `BrowserWindow.getFocusedWindow()` each
 * time. A single-window app keeps this trivially correct; multi-window
 * support would replace this with a focus map.
 */
let mainWindow: BrowserWindow | null = null;

/**
 * Spawn the main BrowserWindow.
 *
 * Loads the Vite dev server in development (`VITE_DEV_SERVER_URL`) and the
 * compiled renderer bundle in production. Context isolation is forced on so
 * the preload script is the only bridge into the Renderer.
 *
 * @returns The created window so the menu / fatal handlers can target it.
 */
function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  if (process.env.MME_DEV === "1" || process.env.VITE_DEV_SERVER_URL !== undefined) {
    window.webContents.openDevTools({ mode: "detach" });
  }

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  return window;
}

/**
 * Build the initial {@link MenuStateSnapshot} from persisted settings.
 *
 * Used by `whenReady` to seed the menu controller before the renderer has a
 * chance to push its own state. The Renderer overwrites this on first
 * paint via `mme:menu:setState`.
 *
 * @returns The seeded snapshot.
 */
const buildInitialMenuSnapshot = (): MenuStateSnapshot => ({
  hasDirty: false,
  recentFiles: getSettings().recentFiles,
  theme: getSettings().theme === "dark" ? "dark" : "light",
  columns: [],
});

/**
 * Forward a menu activation to the focused renderer.
 *
 * Centralised here so {@link initializeMenuController} stays decoupled from
 * the BrowserWindow. Silently drops the event when no window is focused
 * (which happens during early init before the first frame paints).
 *
 * @param payload - Action + data captured from the native menu.
 */
const emitMenuAction = (payload: MenuActionPayload): void => {
  const window = mainWindow ?? BrowserWindow.getFocusedWindow();
  if (window === null || window.webContents.isDestroyed()) {
    return;
  }

  window.webContents.send(IpcKeys.MenuAction, payload);
};

app.whenReady().then(() => {
  setupLogger();
  initializeSettings(app.getPath("userData"));
  initializeIpcEvents();
  mainWindow = createWindow();

  setupFatalHandlers({ getWindow: () => mainWindow });

  initializeMenuController({
    initialSnapshot: buildInitialMenuSnapshot(),
    locale: resolveLocale({
      preference: getSettings().locale,
      systemLocale: app.getLocale(),
    }),
    emit: emitMenuAction,
    websiteUrl: PROJECT_WEBSITE_URL,
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on("will-quit", () => {
  releaseIpcEvents();
  releaseMenuController();
  releaseSettings();
});

app.on("window-all-closed", () => {
  app.quit();
});
