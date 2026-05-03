import { Buffer } from "node:buffer";
import { createRequire } from "node:module";
import { Command } from "commander";
import { createReadCommand } from "./commands/read/read.js";
import { registerVersionAndHelp } from "./commands/registerVersionAndHelp.js";
import { createWriteCommand } from "./commands/write/write.js";
import { ExitCode } from "./errors/exitCodes.js";
import { formatMmeError } from "./errors/formatMmeError.js";
import type { CliContext, RunResult } from "./types.js";

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
 * Default {@link CliContext}, wiring stdin to the real `process.stdin`.
 *
 * @returns A context using the real process streams.
 */
const defaultContext = (): CliContext => ({ stdin: process.stdin });

/**
 * Build a fully configured commander {@link Command} for the CLI.
 *
 * Each call returns a fresh instance so tests can run in parallel without
 * leaking state. `exitOverride()` is engaged so commander throws
 * `CommanderError` instead of calling `process.exit` directly; the bin layer
 * (and {@link runCli}) translate those throws into exit codes.
 *
 * @param context - Optional side-channel context (currently the stdin
 *   iterable for the streaming `read` mode). Defaults to a context backed
 *   by the real `process.stdin`.
 * @returns A new commander program with version / help / global flags + the
 *   `read` subcommand wired up.
 */
export const createProgram = (context: CliContext = defaultContext()): Command => {
  const program = registerVersionAndHelp(new Command(), packageMeta.version).exitOverride();
  program.addCommand(createReadCommand(context));
  program.addCommand(createWriteCommand(context));
  return program;
};

/** Optional knobs accepted by {@link runCli}. */
type RunCliOptions = {
  /** Synthetic stdin payload. When omitted, an empty stdin is used. */
  readonly stdin?: Uint8Array;
};

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
 * @param options - Optional knobs (e.g. a synthetic `stdin` payload).
 * @returns Captured streams and the resolved exit code.
 */
export const runCli = async (
  argv: readonly string[],
  options: RunCliOptions = {},
): Promise<RunResult> => {
  const stdoutChunks: string[] = [];
  const stdoutBuffers: Buffer[] = [];
  const stderrChunks: string[] = [];
  const originalStdoutWrite = process.stdout.write;
  const originalStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    if (typeof chunk === "string") {
      stdoutChunks.push(chunk);
      stdoutBuffers.push(Buffer.from(chunk, "utf8"));
    } else {
      stdoutChunks.push(Buffer.from(chunk).toString("utf8"));
      stdoutBuffers.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderrChunks.push(typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8"));
    return true;
  }) as typeof process.stderr.write;

  const context: CliContext = {
    stdin: makeStdin(options.stdin),
  };

  let exitCode: number = ExitCode.Success;
  try {
    await createProgram(context).parseAsync(argv as readonly string[] as string[], {
      from: "user",
    });
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

  const merged = Buffer.concat(stdoutBuffers);
  return {
    exitCode,
    stdout: stdoutChunks.join(""),
    stdoutBytes: new Uint8Array(merged.buffer, merged.byteOffset, merged.byteLength),
    stderr: stderrChunks.join(""),
  };
};

/**
 * Build a synthetic stdin iterable from an optional byte payload.
 *
 * When `bytes` is `undefined` the iterable yields nothing — exactly what the
 * `read --stdin` flow sees when the user never piped anything.
 *
 * @param bytes - Optional payload to deliver as a single chunk.
 * @returns An async iterable suitable for {@link CliContext.stdin}.
 */
const makeStdin = (bytes: Uint8Array | undefined): AsyncIterable<Uint8Array> => ({
  [Symbol.asyncIterator]: async function* () {
    if (bytes !== undefined) {
      yield bytes;
    }
  },
});
