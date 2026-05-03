#!/usr/bin/env node
import { createProgram } from "../cli.js";
import { ExitCode } from "../errors/exitCodes.js";
import { formatMmeError } from "../errors/formatMmeError.js";
import { getLogger } from "../output/logger.js";

/**
 * Whether `--verbose` is present in `process.argv`.
 *
 * Read directly from argv (rather than commander's parsed options) because
 * the unhandled-error path may fire before commander has a chance to populate
 * `program.opts()`. The check is intentionally permissive — anything matching
 * the long flag enables stack traces.
 *
 * @returns `true` when the flag is set.
 */
const hasVerboseFlag = (): boolean => process.argv.includes("--verbose");

/**
 * Render a fatal error and stamp `process.exitCode = 1`.
 *
 * Used by both `uncaughtException` and `unhandledRejection` handlers. The
 * stack trace is only surfaced under `--verbose`; otherwise users get a
 * single-line classified message. The handler returns synchronously so the
 * Node runtime can finish flushing pending I/O before terminating.
 *
 * @param origin - Tag identifying which top-level handler fired.
 * @param error - The thrown / rejected value.
 */
const onFatal = (origin: "uncaughtException" | "unhandledRejection", error: unknown): void => {
  const formatted = formatMmeError(error);
  const logger = getLogger();
  if (formatted.message !== "") {
    logger.error(formatted.message);
  } else {
    logger.error(`[mme] ${origin}`);
  }

  if (hasVerboseFlag() && error instanceof Error && error.stack !== undefined) {
    logger.debug(error.stack);
  }

  process.exitCode = ExitCode.Failure;
};

process.on("uncaughtException", (error) => onFatal("uncaughtException", error));
process.on("unhandledRejection", (reason) => onFatal("unhandledRejection", reason));

/**
 * Bin entry point: parse `process.argv`, translate any thrown value into the
 * documented exit code, and set `process.exitCode` (never `process.exit`) so
 * pending async resources finish before Node terminates.
 */
const main = async (): Promise<void> => {
  try {
    await createProgram().parseAsync(process.argv);
    process.exitCode = ExitCode.Success;
  } catch (error) {
    const { message, exitCode } = formatMmeError(error);
    if (message !== "") {
      getLogger().error(message);
    }

    process.exitCode = exitCode;
  }
};

await main();
