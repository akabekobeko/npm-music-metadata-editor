import { CommanderError } from "commander";

/**
 * Parsed `<n>` / `<n>/<total>` spec for `--track` and `--disc`.
 */
export type TrackSpec = {
  /** Position number (1-based). */
  readonly number: number;
  /** Total count when the user supplied `<n>/<total>`. */
  readonly total?: number;
};

/**
 * Parse `"3"` or `"3/12"` into a {@link TrackSpec}.
 *
 * Both halves must be non-negative integers. When the input is missing the
 * `/<total>` segment the resulting spec leaves `total` unset (so the caller
 * does not implicitly clear an existing `trackTotal` / `discTotal`).
 *
 * Errors raise a {@link CommanderError} with `exitCode = 2` so the CLI
 * surface treats them like any other usage failure.
 *
 * @param raw - The raw flag value supplied on the command line.
 * @param flag - The flag name (`--track` / `--disc`) used in error messages.
 * @returns The parsed {@link TrackSpec}.
 */
export const parseTrackSpec = (raw: string, flag: string): TrackSpec => {
  const parts = raw.split("/");
  if (parts.length > 2) {
    return usageError(`${flag}: expected "<n>" or "<n>/<total>", got "${raw}"`);
  }

  const number = parseNonNegativeInt(parts[0] ?? "", `${flag} (number)`);
  if (parts.length === 1) {
    return { number };
  }

  const total = parseNonNegativeInt(parts[1] ?? "", `${flag} (total)`);
  return { number, total };
};

/**
 * Parse a string into a non-negative integer or throw a usage error.
 *
 * @param raw - String to parse.
 * @param label - Label embedded in the error message.
 * @returns The parsed integer.
 */
const parseNonNegativeInt = (raw: string, label: string): number => {
  if (!/^\d+$/.test(raw)) {
    return usageError(`${label}: expected a non-negative integer, got "${raw}"`);
  }

  return Number.parseInt(raw, 10);
};

/**
 * Throw a commander usage error so the CLI maps it to exit code 2.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};
