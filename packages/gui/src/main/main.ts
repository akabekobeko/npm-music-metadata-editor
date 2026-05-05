import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, ipcMain } from "electron";
import { registerIpcHandlers } from "./ipc/register.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Spawn the main BrowserWindow.
 *
 * Loads the Vite dev server in development (`VITE_DEV_SERVER_URL`) and the
 * compiled renderer bundle in production. Context isolation is forced on so
 * the preload script is the only bridge into the Renderer.
 */
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers({
    ipcMain,
    getFocusedWindow: () => BrowserWindow.getFocusedWindow(),
  });
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
