import { gray, red, resolveColorMode, yellow } from "./colors.js";

/** Sink callable taking a single string chunk (matches `process.stderr.write`). */
type Sink = (chunk: string) => void;

/**
 * Logger that respects `--quiet` / `--verbose` / `--no-color`.
 *
 * Every stderr write (informational status, warnings, debug traces, terminal
 * errors) is routed through this interface so that the global flags apply
 * uniformly. Each method takes the raw message — the logger owns the
 * `[mme]` / `[warn]` / `[debug]` prefixing and ANSI styling.
 */
export type Logger = {
  /**
   * Emit a non-error status line.
   *
   * Suppressed when `--quiet` is set. Format: dim-grey `[mme] <message>`.
   */
  readonly info: (message: string) => void;
  /**
   * Emit a warning.
   *
   * Suppressed when `--quiet` is set. Format: yellow `[warn] <message>`.
   */
  readonly warn: (message: string) => void;
  /**
   * Emit an error message.
   *
   * Always shown — `--quiet` only silences info / warn. Format:
   * red `<message>` (the caller has typically already added a `[mme:<code>]`
   * or `[mme]` prefix via {@link ../errors/formatMmeError.ts}).
   */
  readonly error: (message: string) => void;
  /**
   * Emit a debug line.
   *
   * Only shown when `--verbose` is set. Format: dim-grey `[debug] <message>`.
   */
  readonly debug: (message: string) => void;
};

/** Inputs accepted by {@link createLogger}. */
type CreateLoggerArgs = {
  /** When `true`, suppress info / warn output (errors still flow). */
  readonly quiet: boolean;
  /** When `true`, surface debug output. */
  readonly verbose: boolean;
  /** When `true`, force-disable ANSI color escapes. */
  readonly noColor: boolean;
  /**
   * Optional sink override — defaults to `process.stderr.write`. Tests pass a
   * spy so they can inspect the produced strings.
   */
  readonly sink?: Sink;
  /** Whether the sink should be assumed to be a TTY (forwarded to color resolution). */
  readonly isTty?: boolean;
  /** Override env snapshot — defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>;
};

/**
 * Build a {@link Logger} from CLI flags + the current TTY.
 *
 * The returned object captures all knobs at construction time so calls to
 * `.info(...)` etc. do not need to re-inspect environment variables. This is
 * the single point in the CLI that decides whether color is enabled and
 * whether `--quiet` / `--verbose` should affect a given line.
 *
 * @param args - The parsed global flags plus optional test seams.
 * @returns A `Logger` instance ready to receive messages.
 */
export const createLogger = ({
  quiet,
  verbose,
  noColor,
  sink = (chunk) => void process.stderr.write(chunk),
  isTty,
  env,
}: CreateLoggerArgs): Logger => {
  const useColor = resolveColorMode({
    noColor,
    ...(env === undefined ? {} : { env }),
    ...(isTty === undefined ? {} : { isTty }),
  });

  return {
    info: (message: string): void => {
      if (quiet) {
        return;
      }

      sink(`${gray(`[mme] ${message}`, useColor)}\n`);
    },
    warn: (message: string): void => {
      if (quiet) {
        return;
      }

      sink(`${yellow(`[warn] ${message}`, useColor)}\n`);
    },
    error: (message: string): void => {
      sink(`${red(message, useColor)}\n`);
    },
    debug: (message: string): void => {
      if (!verbose) {
        return;
      }

      sink(`${gray(`[debug] ${message}`, useColor)}\n`);
    },
  };
};
