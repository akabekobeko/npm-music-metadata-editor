import { createRequire } from "node:module";
import { Command } from "commander";
import { registerVersionAndHelp } from "./commands/registerVersionAndHelp.js";
import { ExitCode } from "./errors/exitCodes.js";
import { formatMmeError } from "./errors/formatMmeError.js";
import type { RunResult } from "./types.js";

/**
 * Local `package.json` view, narrowed to the fields the CLI consumes.
 */
type PackageMeta = {
  /** Semver string surfaced by `mme --version`. */
  readonly version: string;
};

const require = createRequire(import.meta.url);
const packageMeta = require("../package.json") as PackageMeta;

/**
 * Build a fully configured commander {@link Command} for the CLI.
 *
 * Each call returns a fresh instance so tests can run in parallel without
 * leaking state. `exitOverride()` is engaged so commander throws
 * `CommanderError` instead of calling `process.exit` directly; the bin layer
 * (and {@link runCli}) translate those throws into exit codes.
 *
 * @returns A new commander program with version / help / global flags wired up.
 */
export const createProgram = (): Command =>
  registerVersionAndHelp(new Command(), packageMeta.version).exitOverride();

/**
 * Run the CLI in-process and capture stdout / stderr.
 *
 * This is the test-friendly entry point — it sidesteps the bin shim by
 * building a fresh program, swapping the `process.stdout.write` /
 * `process.stderr.write` channels for buffer-collecting stubs, and translating
 * any thrown value via {@link formatMmeError}. The real `process` streams are
 * always restored, even when the program throws, so subsequent test cases see
 * a clean environment.
 *
 * @param argv - User arguments only (no `node` / script path), e.g. `["--version"]`.
 * @returns Captured streams and the resolved exit code.
 */
export const runCli = async (argv: readonly string[]): Promise<RunResult> => {
  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdoutChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stderr.write;

  let exitCode: number = ExitCode.Success;
  try {
    await createProgram().parseAsync(argv as readonly string[] as string[], { from: "user" });
  } catch (error) {
    const formatted = formatMmeError(error);
    if (formatted.message !== "") {
      stderrChunks.push(`${formatted.message}\n`);
    }

    exitCode = formatted.exitCode;
  } finally {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  }

  return {
    exitCode,
    stdout: stdoutChunks.join(""),
    stderr: stderrChunks.join(""),
  };
};
