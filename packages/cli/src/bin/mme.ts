#!/usr/bin/env node
import { createProgram } from "../cli.js";
import { ExitCode } from "../errors/exitCodes.js";
import { formatMmeError } from "../errors/formatMmeError.js";

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
      process.stderr.write(`${message}\n`);
    }

    process.exitCode = exitCode;
  }
};

await main();
