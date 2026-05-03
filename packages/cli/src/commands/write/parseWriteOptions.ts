import type { AudioFormat } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import type { WriteCliRawOptions, WriteCommandOptions, WriteOutput, WriteSource } from "./types.js";

/** Arguments accepted by {@link parseWriteOptions}. */
type Args = {
  /** Optional positional file argument (`mme write <file>`). */
  readonly file: string | undefined;
  /** Raw options bag from commander's `command.opts()`. */
  readonly opts: WriteCliRawOptions;
};

const VALID_AUDIO_FORMATS: ReadonlySet<AudioFormat> = new Set<AudioFormat>([
  "mp3",
  "flac",
  "mp4",
  "m4a",
  "ogg",
  "opus",
  "wav",
  "aiff",
  "wma",
  "ape",
]);

/**
 * Throw a commander usage error so the CLI maps it to exit code 2.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};

/**
 * Validate that a string is a known {@link AudioFormat}.
 *
 * @param value - Raw `--format` value supplied by the user.
 * @returns The same value, narrowed to `AudioFormat`.
 */
const checkAudioFormat = (value: string): AudioFormat => {
  if (!VALID_AUDIO_FORMATS.has(value as AudioFormat)) {
    return usageError(
      `--format: unknown audio format "${value}" (allowed: ${[...VALID_AUDIO_FORMATS].join(", ")})`,
    );
  }

  return value as AudioFormat;
};

/**
 * Resolve the {@link WriteSource} from the file argument and `--stdin` /
 * `--format`.
 *
 * @param file - Optional positional file argument.
 * @param opts - Raw commander options.
 * @returns The validated source.
 */
const resolveSource = (file: string | undefined, opts: WriteCliRawOptions): WriteSource => {
  if (opts.stdin === true && file !== undefined) {
    return usageError("`--stdin` and a file argument are mutually exclusive");
  }

  if (opts.stdin === true) {
    if (opts.format === undefined) {
      return usageError("`--stdin` requires `--format <fmt>` (auto-detection is not available)");
    }

    return { kind: "stdin", format: checkAudioFormat(opts.format) };
  }

  if (file === undefined) {
    return usageError("`mme write` requires either a `<file>` argument or `--stdin`");
  }

  return { kind: "file", path: file };
};

/**
 * Resolve the {@link WriteOutput} from `--output` and the source kind.
 *
 * - File source + no `--output` → in-place overwrite.
 * - File source + `--output <path>` → write to `<path>`.
 * - Stream source + `--output -` → write bytes to stdout.
 * - Stream source + `--output <path>` → write to `<path>` (rare, but core
 *   supports it via `saveTrack({ source: bytes, outputPath })`).
 * - Stream source + no `--output` → usage error (callers must pick one).
 *
 * @param source - Already-resolved source.
 * @param opts - Raw commander options.
 * @returns The validated output destination.
 */
const resolveOutput = (source: WriteSource, opts: WriteCliRawOptions): WriteOutput => {
  if (source.kind === "stdin") {
    if (opts.output === undefined) {
      return usageError("`--stdin` requires `--output <path|->` to choose a destination");
    }

    return opts.output === "-" ? { kind: "stdout" } : { kind: "path", path: opts.output };
  }

  if (opts.output === undefined) {
    return { kind: "in-place" };
  }

  if (opts.output === "-") {
    return usageError("`--output -` is only valid with `--stdin`");
  }

  return { kind: "path", path: opts.output };
};

/**
 * Translate commander's raw write-command output into a validated
 * {@link WriteCommandOptions}.
 *
 * Tag-related flags are not consumed here — `parseTagOverrides` reads the
 * same raw bag once mode resolution succeeds. Validations covered:
 *
 * - file vs `--stdin` mutual exclusion + `--format` requirement.
 * - `--output -` only with stream mode.
 * - `--clear` is rejected in stream mode (core's `writeMetadata` cannot
 *   distinguish "preserve" from "clear" on per-field basis).
 * - `--dry-run` cannot pair with `--output -` (nothing to write to stdout).
 * - `--tag-file` value `-` requires `--stdin` to also be set so stdin is
 *   not double-consumed in incompatible ways.
 *
 * @returns The validated mode-level options.
 */
export const parseWriteOptions = ({ file, opts }: Args): WriteCommandOptions => {
  const source = resolveSource(file, opts);

  if (source.kind === "stdin" && (opts.clear ?? []).length > 0) {
    return usageError(
      "`--clear` is unavailable in stream mode (writeMetadata preserves undefined fields)",
    );
  }

  const output = resolveOutput(source, opts);
  const dryRun = opts.dryRun === true;
  if (dryRun && source.kind === "stdin") {
    return usageError("`--dry-run` is only available in file mode");
  }

  if (dryRun && output.kind === "stdout") {
    return usageError("`--dry-run` and `--output -` are mutually exclusive");
  }

  if (opts.tagFile === "-" && source.kind === "stdin") {
    return usageError(
      "`--tag-file -` cannot be combined with `--stdin` (both would consume stdin)",
    );
  }

  return {
    source,
    output,
    dryRun,
    atomic: opts.atomic !== false,
  };
};
