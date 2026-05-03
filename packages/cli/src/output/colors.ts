/**
 * ANSI styling helpers and the shared color-mode resolver.
 *
 * Color decisions live in a single place so that command handlers never have
 * to inspect `process.env` or `tty` themselves. Phase 5 wires this module
 * into {@link ./createLogger.ts} (for stderr coloring) and a forthcoming
 * `--no-color`-aware pretty renderer (stdout labels).
 */

/** Inputs accepted by {@link resolveColorMode}. */
type ResolveColorModeArgs = {
  /** Value of the commander `--no-color` flag (true when `--no-color` is set). */
  readonly noColor: boolean;
  /** Mapping of environment variables — defaults to `process.env`. */
  readonly env?: Readonly<Record<string, string | undefined>>;
  /**
   * Whether stderr is a TTY capable of ANSI escapes. Defaults to a probe of
   * `process.stderr.isTTY` so callers do not need to wire it themselves.
   */
  readonly isTty?: boolean;
};

/**
 * Decide whether the CLI should emit ANSI color escapes.
 *
 * Precedence (first match wins):
 *
 * 1. `FORCE_COLOR` is set to a non-empty, non-zero value → enable.
 *    Handles the CI convention (`FORCE_COLOR=1`) for capturing colored logs.
 * 2. `--no-color` flag set → disable.
 * 3. `NO_COLOR` env set to any value → disable (per <https://no-color.org/>).
 * 4. Stderr is not a TTY → disable.
 * 5. Otherwise → enable.
 *
 * @param args - Color-mode inputs (flag, env snapshot, TTY hint).
 * @returns `true` when color escapes should be emitted, `false` otherwise.
 */
export const resolveColorMode = ({
  noColor,
  env = process.env,
  isTty = process.stderr.isTTY === true,
}: ResolveColorModeArgs): boolean => {
  const force = env.FORCE_COLOR;
  if (force !== undefined && force !== "" && force !== "0") {
    return true;
  }

  if (noColor) {
    return false;
  }

  if (env.NO_COLOR !== undefined) {
    return false;
  }

  return isTty;
};

/**
 * Style text in red — used for error messages on stderr.
 *
 * @param text - The text payload.
 * @param enabled - Whether color is enabled (per {@link resolveColorMode}).
 * @returns The styled (or unstyled) string.
 */
export const red = (text: string, enabled: boolean): string =>
  enabled ? `\x1b[31m${text}\x1b[0m` : text;

/**
 * Style text in yellow — used for warning messages on stderr.
 *
 * @param text - The text payload.
 * @param enabled - Whether color is enabled (per {@link resolveColorMode}).
 * @returns The styled (or unstyled) string.
 */
export const yellow = (text: string, enabled: boolean): string =>
  enabled ? `\x1b[33m${text}\x1b[0m` : text;

/**
 * Style text in dim grey — used for informational / debug messages on stderr.
 *
 * @param text - The text payload.
 * @param enabled - Whether color is enabled (per {@link resolveColorMode}).
 * @returns The styled (or unstyled) string.
 */
export const gray = (text: string, enabled: boolean): string =>
  enabled ? `\x1b[90m${text}\x1b[0m` : text;

/**
 * Style text in bold blue — reserved for `--pretty` labels on stdout.
 *
 * @param text - The text payload.
 * @param enabled - Whether color is enabled (per {@link resolveColorMode}).
 * @returns The styled (or unstyled) string.
 */
export const boldBlue = (text: string, enabled: boolean): string =>
  enabled ? `\x1b[1;34m${text}\x1b[0m` : text;
