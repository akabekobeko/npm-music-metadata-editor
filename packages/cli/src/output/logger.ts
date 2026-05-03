import { createLogger, type Logger } from "./createLogger.js";

/**
 * Process-wide active {@link Logger}.
 *
 * The bin shim and `runCli` re-initialize this singleton during program setup
 * (after parsing the global `--no-color` / `--quiet` / `--verbose` flags), so
 * any handler that imports `getLogger()` automatically picks up the current
 * preferences. Initialized lazily with a "no flags" logger so module-load
 * order is irrelevant during tests.
 */
let activeLogger: Logger = createLogger({ quiet: false, verbose: false, noColor: false });

/**
 * Replace the process-wide logger.
 *
 * Called by the program bootstrap once the global CLI flags are known. Tests
 * use it to inject spies and to restore the default afterwards.
 *
 * @param logger - The new active logger.
 */
export const setLogger = (logger: Logger): void => {
  activeLogger = logger;
};

/**
 * Read the process-wide logger.
 *
 * @returns The currently active logger (never `undefined` — the module is
 *   initialized eagerly).
 */
export const getLogger = (): Logger => activeLogger;

/**
 * Restore the default logger (no flags applied) — used by test teardown so a
 * single test does not leak quiet / verbose / no-color state into siblings.
 */
export const resetLogger = (): void => {
  activeLogger = createLogger({ quiet: false, verbose: false, noColor: false });
};
