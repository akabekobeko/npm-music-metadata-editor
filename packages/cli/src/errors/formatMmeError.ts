import { isMmeError } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import { ExitCode, type ExitCodeValue, exitCodeForMmeError } from "./exitCodes.js";

/** Result of {@link formatMmeError}. */
export type FormattedError = {
  /**
   * Stderr-bound message describing the failure.
   *
   * Empty when the error represents a normal terminal output handled by
   * commander itself (`--help` / `--version`); the bin / runner skips writing
   * an empty message.
   */
  readonly message: string;
  /** Exit code that the bin layer should pass to `process.exitCode`. */
  readonly exitCode: ExitCodeValue;
};

/**
 * Filesystem syscall codes that map to {@link ExitCode.IoError}.
 *
 * Any `Error` whose `code` property matches one of these is treated as an I/O
 * failure (exit `4`); other plain `Error` values fall back to
 * {@link ExitCode.Failure}.
 */
const IO_ERROR_CODES: ReadonlySet<string> = new Set([
  "ENOENT",
  "EACCES",
  "EISDIR",
  "ENOTDIR",
  "EPERM",
  "EBUSY",
  "EMFILE",
  "EROFS",
]);

/**
 * `CommanderError.code` values that mean "commander already printed the
 * intended output to stdout and asked us to exit cleanly".
 */
const COMMANDER_NORMAL_EXIT_CODES: ReadonlySet<string> = new Set([
  "commander.helpDisplayed",
  "commander.help",
  "commander.version",
]);

/**
 * Convert any thrown value into the user-facing message + exit code pair.
 *
 * Layers of recognition (first match wins):
 *
 * - `MmeError` → `[mme:<code>] <message>` plus the table lookup in
 *   {@link exitCodeForMmeError}, falling back to {@link ExitCode.Failure}
 *   when the code is unmapped (the table is intentionally sparse).
 * - `CommanderError` whose code is a normal exit (`--help` / `--version`)
 *   → empty message + {@link ExitCode.Success}.
 * - `CommanderError` otherwise → `[mme] <message>` + {@link ExitCode.Usage}.
 * - Plain `Error` → `[mme] <message>`. Exit code is {@link ExitCode.IoError}
 *   when the error has a known FS syscall `code`, else
 *   {@link ExitCode.Failure}.
 * - Any other value → `String(error)` + {@link ExitCode.Failure}.
 *
 * @param error - Value caught from the CLI (usually inside the bin shim).
 * @returns The classified message + exit code pair.
 */
export const formatMmeError = (error: unknown): FormattedError => {
  if (isMmeError(error)) {
    const exitCode = exitCodeForMmeError[error.code] ?? ExitCode.Failure;
    return { message: `[mme:${error.code}] ${error.message}`, exitCode };
  }

  if (error instanceof CommanderError) {
    if (COMMANDER_NORMAL_EXIT_CODES.has(error.code)) {
      return { message: "", exitCode: ExitCode.Success };
    }

    return { message: `[mme] ${error.message}`, exitCode: ExitCode.Usage };
  }

  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code;
    const exitCode =
      typeof code === "string" && IO_ERROR_CODES.has(code) ? ExitCode.IoError : ExitCode.Failure;
    return { message: `[mme] ${error.message}`, exitCode };
  }

  return { message: String(error), exitCode: ExitCode.Failure };
};
