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
 * Phase 1 only declares the flags; later phases wire up colored output and
 * progress suppression. Keeping the type here avoids re-declaring the shape in
 * every command module added in subsequent phases.
 */
export type CliGlobalOptions = {
  /** When `true`, command output should suppress ANSI color codes. */
  readonly noColor: boolean;
  /** When `true`, command output should suppress non-error chatter. */
  readonly quiet: boolean;
};
