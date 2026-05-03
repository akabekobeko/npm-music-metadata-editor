/**
 * Result of running the CLI in-process.
 *
 * Returned by the test-friendly entry point (`runCli`) so callers can assert on
 * captured streams and the resolved exit code without spawning a child process.
 */
export type RunResult = {
  /** Exit code that the bin layer would pass to `process.exit`. */
  readonly exitCode: number;
  /** Captured `process.stdout.write` payload (UTF-8). */
  readonly stdout: string;
  /** Captured `process.stderr.write` payload (UTF-8). */
  readonly stderr: string;
};

/**
 * Globally toggled output preferences shared across commands.
 *
 * Phase 1 only declared the flags; later phases wire up colored output and
 * progress suppression. Keeping the type here avoids re-declaring the shape in
 * every command module added in subsequent phases.
 */
export type CliGlobalOptions = {
  /** When `true`, command output should suppress ANSI color codes. */
  readonly noColor: boolean;
  /** When `true`, command output should suppress non-error chatter. */
  readonly quiet: boolean;
};

/**
 * Side-channel context shared between `createProgram` and its subcommands.
 *
 * Subcommands that need to consume external resources (currently only stdin
 * for the streaming `read` mode) take them through this object instead of
 * touching `process` directly. Tests build a context with a synthetic stdin
 * iterable; the bin layer passes the real `process.stdin`.
 */
export type CliContext = {
  /**
   * Async iterable yielding stdin chunks. `process.stdin` already implements
   * this interface, and tests provide a single-yield iterable wrapping a
   * `Uint8Array`.
   */
  readonly stdin: AsyncIterable<Uint8Array>;
};
