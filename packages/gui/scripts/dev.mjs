import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import electron from "electron";
import { build, createServer } from "vite";

const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

/** @type {import('node:child_process').ChildProcess | null} */
let electronProcess = null;

/**
 * (Re)start the Electron process.
 * Kills any previously spawned instance before launching a new one.
 * @param {string} root - Package root directory.
 */
function startElectron(root) {
  if (electronProcess) {
    electronProcess.removeAllListeners();
    electronProcess.kill();
    electronProcess = null;
  }

  electronProcess = spawn(String(electron), [path.join(root, "dist/main/main.js")], {
    stdio: "inherit",
    env: {
      ...process.env,
      VITE_DEV_SERVER_URL: DEV_SERVER_URL,
    },
  });

  electronProcess.on("close", (code) => {
    if (code !== null) {
      process.exit(code);
    }
  });
}

/**
 * Start the development environment.
 * Launches the renderer dev server, then watch-builds preload and main processes.
 */
async function startDev() {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const root = path.join(__dirname, "..");

  // 1. Start renderer dev server
  const server = await createServer({
    configFile: path.join(root, "src/renderer/vite.config.ts"),
    root: path.join(root, "src/renderer"),
    server: { port: DEV_SERVER_PORT, strictPort: true },
  });
  await server.listen();
  console.log(`Renderer dev server running on ${DEV_SERVER_URL}`);

  // 2. Watch-build preload
  await build({
    configFile: path.join(root, "src/preload/vite.config.ts"),
    root: path.join(root, "src/preload"),
    build: {
      watch: {},
    },
    plugins: [
      {
        name: "preload-watcher",
        writeBundle() {
          console.log("Preload rebuilt — restarting Electron...");
          startElectron(root);
        },
      },
    ],
  });

  // 3. Watch-build main
  await build({
    configFile: path.join(root, "src/main/vite.config.ts"),
    root: path.join(root, "src/main"),
    build: {
      watch: {},
    },
    plugins: [
      {
        name: "main-watcher",
        writeBundle() {
          console.log("Main rebuilt — starting Electron...");
          startElectron(root);
        },
      },
    ],
  });
}

startDev();
