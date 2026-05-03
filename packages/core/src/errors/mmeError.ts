/**
 * Error codes emitted by the public API.
 *
 * These categorize *why* a call failed without coupling callers to the internal
 * format-specific error messages. The set is intentionally small; new codes are
 * added here rather than introducing new shapes.
 */
export type MmeErrorCode =
  /** No registered format matched the input (signature + extension both failed). */
  | "unsupported-format"
  /** A tag block was found but its bytes were structurally invalid. */
  | "invalid-tag"
  /** The input ended before a required structure could be read in full. */
  | "truncated-input"
  /** The input uses a feature we do not yet support (e.g. compression / encryption). */
  | "unsupported-feature";

/**
 * Tagged error type thrown by the public API.
 *
 * Built on top of the native `Error` so that throwing an `MmeError` keeps a
 * usable stack trace; the `name` discriminator and the `code` field let callers
 * branch on the failure category without parsing the message.
 */
export type MmeError = Error & {
  readonly name: "MmeError";
  readonly code: MmeErrorCode;
};

/** Arguments for {@link createMmeError}. */
type Args = {
  /** Failure category. */
  code: MmeErrorCode;
  /** Human-readable message; surfaced via `Error.message`. */
  message: string;
  /** Underlying error to chain (forwarded to `Error.cause`). */
  cause?: unknown;
};

/**
 * Build a tagged {@link MmeError}.
 *
 * Implemented as a factory function (no `class`) per project rules. The returned
 * value is a real `Error` instance with `name = "MmeError"` plus the structured
 * fields, so it travels well across `throw` boundaries and `instanceof Error`
 * checks.
 *
 * @returns A new `MmeError`.
 */
export const createMmeError = ({ code, message, cause }: Args): MmeError => {
  const error = new Error(message, cause === undefined ? undefined : { cause });
  error.name = "MmeError";
  return Object.assign(error, { code }) as MmeError;
};

/**
 * Type guard for {@link MmeError}.
 *
 * @param value - Arbitrary value (typically a caught error).
 * @returns `true` when `value` is an `MmeError` produced by {@link createMmeError}.
 */
export const isMmeError = (value: unknown): value is MmeError =>
  value instanceof Error && (value as { name?: unknown }).name === "MmeError";
