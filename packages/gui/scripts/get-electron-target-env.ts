import { execFileSync } from "node:child_process";
import electron from "electron";

/**
 * Query a value from the installed Electron's `process.versions`.
 *
 * @param key - Key in `process.versions` (e.g. `"chrome"`, `"node"`).
 * @returns The full version string.
 */
function queryElectronVersion(key: string): string {
  return execFileSync(String(electron), ["-e", `process.stdout.write(process.versions.${key})`], {
    encoding: "utf-8",
    timeout: 10_000,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
  }).trim();
}

/**
 * Map a Chrome major version to the highest ES target it fully supports.
 *
 * @param major - Chrome major version.
 * @returns ES target, e.g. `"ES2024"`.
 */
function chromeToEsTarget(major: number): string {
  if (major >= 133) return "ES2024";
  if (major >= 117) return "ES2023";
  return "ES2022";
}

/**
 * Map a Node.js major version to the highest ES target it fully supports.
 *
 * @param major - Node.js major version.
 * @returns ES target, e.g. `"ES2024"`.
 */
function nodeToEsTarget(major: number): string {
  if (major >= 22) return "ES2024";
  if (major >= 20) return "ES2023";
  return "ES2022";
}

/** Target environment derived from the installed Electron. */
export type ElectronTargetEnv = {
  esTarget: string;
  chromeMajor: number;
  nodeMajor: number;
  nodeVersion: string;
};

/**
 * Get the target environment information based on the installed Electron.
 *
 * Returns the lower of Chrome and Node ES targets to ensure compatibility
 * across both main and renderer processes.
 *
 * @returns The resolved target environment.
 */
export function getElectronTargetEnv(): ElectronTargetEnv {
  const chromeVersion = queryElectronVersion("chrome");
  const nodeVersion = queryElectronVersion("node");
  const chromeMajor = Number(chromeVersion.split(".")[0]);
  const nodeMajor = Number(nodeVersion.split(".")[0]);
  const chromeEs = chromeToEsTarget(chromeMajor);
  const nodeEs = nodeToEsTarget(nodeMajor);
  // Use the lower of the two to ensure compatibility
  const esTarget = chromeEs < nodeEs ? chromeEs : nodeEs;
  return { esTarget, chromeMajor, nodeMajor, nodeVersion };
}
