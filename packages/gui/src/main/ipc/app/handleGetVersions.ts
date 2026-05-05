import { createRequire } from "node:module";
import { app } from "electron";
import type { IpcResponseOf } from "../../../shared/ipc-contract.js";

/**
 * `require` shim used to read sibling `package.json` files at runtime.
 *
 * Vite's renderer bundle is ESM, but reading `package.json` from disk needs a
 * CommonJS resolver to honour the workspace `node_modules` layout. `createRequire`
 * gives us one without dragging in `node:fs` boilerplate.
 */
const requireFromHere = createRequire(import.meta.url);

/**
 * Lazy-resolved version of `@akabeko/music-metadata-editor`.
 *
 * Computed on first access so unit tests can stub `requireFromHere` (via module
 * mocking) without paying the disk read on the happy path. The result is
 * cached because the version cannot change at runtime.
 */
let coreVersionCache: string | undefined;

/**
 * Read the `version` field of a sibling package.
 *
 * @param packageName - npm name of the package to inspect.
 * @returns The version string, or `"0.0.0"` when resolution fails (e.g. running
 *   inside a build that pruned `package.json`).
 */
const readPackageVersion = (packageName: string): string => {
  try {
    const meta = requireFromHere(`${packageName}/package.json`) as { version?: string };
    return meta.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
};

/**
 * Channel handler for `mme:app:getVersions`.
 *
 * Combines the core npm package version with `process.versions` and Electron's
 * own `app.getVersion()` (= the Electron app's `package.json` version, which
 * mirrors the GUI release).
 *
 * @returns A snapshot of the runtime stack versions.
 */
export const handleGetVersions = async (): Promise<IpcResponseOf<"mme:app:getVersions">> => {
  if (coreVersionCache === undefined) {
    coreVersionCache = readPackageVersion("@akabeko/music-metadata-editor");
  }

  return {
    core: coreVersionCache,
    gui: app.getVersion(),
    electron: process.versions.electron ?? "",
    chrome: process.versions.chrome ?? "",
    node: process.versions.node,
  };
};
