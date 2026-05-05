import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getElectronTargetEnv } from "./get-electron-target-env.mjs";

/**
 * Update target and module in a tsconfig JSON file.
 * Performs text-level replacement to preserve the original formatting.
 * @param {{ root: string, relativePath: string, esTarget: string, moduleTarget: string }} args
 *  - root: Package root directory.
 *  - relativePath: tsconfig file relative to `root`.
 *  - esTarget: Value to write into `compilerOptions.target`.
 *  - moduleTarget: Value to write into `compilerOptions.module`.
 */
function updateTsconfig({ root, relativePath, esTarget, moduleTarget }) {
  const filePath = resolve(root, relativePath);
  let text = readFileSync(filePath, "utf-8");
  const json = JSON.parse(text);

  const prevTarget = json.compilerOptions.target;
  const prevModule = json.compilerOptions.module;

  text = text.replace(/("target"\s*:\s*)"[^"]*"/, `$1"${esTarget}"`);
  text = text.replace(/("module"\s*:\s*)"[^"]*"/, `$1"${moduleTarget}"`);

  writeFileSync(filePath, text);
  console.log(
    `  ${relativePath}: target ${prevTarget} -> ${esTarget}, module ${prevModule} -> ${moduleTarget}`,
  );
}

/**
 * Update the build target in a vite.config.ts file.
 * Matches the pattern: target: '...' or target: "..."
 * @param {{ root: string, relativePath: string, newTarget: string }} args
 *  - root: Package root directory.
 *  - relativePath: vite config file relative to `root`.
 *  - newTarget: Value to write into `build.target` (e.g. "node24" or "chrome146").
 */
function updateViteConfig({ root, relativePath, newTarget }) {
  const filePath = resolve(root, relativePath);
  let text = readFileSync(filePath, "utf-8");

  const match = text.match(/target:\s*(['"])([^'"]*)\1/);
  const prev = match ? match[2] : "unknown";

  text = text.replace(/target:\s*(['"])[^'"]*\1/, `target: $1${newTarget}$1`);

  writeFileSync(filePath, text);
  console.log(`  ${relativePath}: ${prev} -> ${newTarget}`);
}

/**
 * Update the Node.js version in this package's `.mise.toml`.
 * The root `.mise.toml` is intentionally left untouched so that core / cli
 * remain on their own Node version independently of Electron's bundled Node.
 * @param {string} root - Package root directory.
 * @param {string} newVersion - Full version string (e.g. "24.14.1")
 */
function updateMiseToml(root, newVersion) {
  const filePath = resolve(root, ".mise.toml");
  let text = readFileSync(filePath, "utf-8");

  const match = text.match(/^node\s*=\s*"([^"]*)"/m);
  const prev = match ? match[1] : "unknown";

  text = text.replace(/^(node\s*=\s*")[^"]*(")/m, `$1${newVersion}$2`);

  writeFileSync(filePath, text);
  console.log(`  node: ${prev} -> ${newVersion}`);
}

/**
 * Sync tsconfig, vite.config.ts, and .mise.toml targets
 * with the installed Electron's bundled Chrome and Node.js versions.
 */
function syncElectronTargets() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const root = resolve(__dirname, "..");

  const { esTarget, chromeMajor, nodeMajor, nodeVersion } = getElectronTargetEnv();

  const chromeTarget = `chrome${chromeMajor}`;
  const nodeTarget = `node${nodeMajor}`;

  console.log(`Electron bundled versions: Chrome ${chromeMajor}, Node ${nodeMajor}`);
  console.log(`ES target: ${esTarget}`);
  console.log(`Vite targets: ${chromeTarget} (renderer), ${nodeTarget} (main/preload)`);

  // TypeScript `module` only accepts up to "ES2022"; for higher ES targets use "ESNext".
  const moduleTarget = esTarget > "ES2022" ? "ESNext" : esTarget;

  console.log("\ntsconfig:");
  updateTsconfig({ root, relativePath: "tsconfig.node.json", esTarget, moduleTarget });
  updateTsconfig({ root, relativePath: "tsconfig.web.json", esTarget, moduleTarget });

  console.log("\nvite.config.ts:");
  updateViteConfig({ root, relativePath: "src/main/vite.config.ts", newTarget: nodeTarget });
  updateViteConfig({ root, relativePath: "src/preload/vite.config.ts", newTarget: nodeTarget });
  updateViteConfig({ root, relativePath: "src/renderer/vite.config.ts", newTarget: chromeTarget });

  console.log("\n.mise.toml:");
  updateMiseToml(root, nodeVersion);

  console.log("\nDone.");
  console.log(
    "\nNote: If the Node.js major version changed, run `mise install` in this package directory to install the new version.",
  );
}

syncElectronTargets();
