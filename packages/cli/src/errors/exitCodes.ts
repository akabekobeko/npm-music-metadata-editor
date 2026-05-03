import type { MmeErrorCode } from "@akabeko/music-metadata-editor";

/**
 * Exit codes emitted by the CLI.
 *
 * The numeric values are the contract documented in
 * `docs/plan/cli/phase-01-foundation.md` (the canonical source). Future phases
 * mirror the table into the user-facing README.
 */
export const ExitCode = {
  /** Successful run. */
  Success: 0,
  /** Generic / unclassified failure. */
  Failure: 1,
  /** Misuse: argument parsing failure raised by commander. */
  Usage: 2,
  /** Format detection failed or no reader/writer is registered. */
  UnsupportedFormat: 3,
  /** File / stream I/O failure (e.g. ENOENT, EACCES). */
  IoError: 4,
  /** A tag block was found but its bytes were structurally invalid. */
  InvalidTag: 5,
} as const;

/** A concrete exit code drawn from {@link ExitCode}. */
export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

/**
 * Lookup table from `MmeError.code` to the CLI exit code.
 *
 * Codes intentionally absent here (e.g. `truncated-input`, `unsupported-feature`,
 * or any new `MmeErrorCode` added in future core releases) fall back to
 * {@link ExitCode.Failure}. The fallback is applied by `formatMmeError`. Keeping
 * the table sparse means a new core code lands as `1` until the CLI explicitly
 * classifies it, never as a misleading existing slot.
 */
export const exitCodeForMmeError: Readonly<Partial<Record<MmeErrorCode, ExitCodeValue>>> = {
  "unsupported-format": ExitCode.UnsupportedFormat,
  "invalid-tag": ExitCode.InvalidTag,
};
