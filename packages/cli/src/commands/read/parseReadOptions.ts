import type { AudioFormat } from "@akabeko/music-metadata-editor";
import { CommanderError } from "commander";
import {
  type ReadCommandOptions,
  type ReadOutputMode,
  type ReadSource,
  TRACK_SECTIONS,
  type TrackSection,
} from "./types.js";

/** Raw `--option` flags emitted by commander for the `read` subcommand. */
export type ReadCliRawOptions = {
  /** When `true`, read from stdin instead of a file argument. */
  readonly stdin?: boolean;
  /** Forced audio format (required with `--stdin`). */
  readonly format?: string;
  /** Render in pretty mode. */
  readonly pretty?: boolean;
  /** Single field path to extract. */
  readonly field?: string;
  /** Comma-separated include list. */
  readonly include?: string;
  /** Comma-separated exclude list. */
  readonly exclude?: string;
  /**
   * Commander resolves `--no-warnings` as `warnings: false`. The default with
   * neither flag specified is `true`.
   */
  readonly warnings?: boolean;
};

/** Arguments accepted by {@link parseReadOptions}. */
type Args = {
  /** Optional positional file argument (`mme read <file>`). */
  readonly file: string | undefined;
  /** Raw options bag from commander's `command.opts()`. */
  readonly opts: ReadCliRawOptions;
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

const TRACK_SECTION_SET: ReadonlySet<string> = new Set<string>(TRACK_SECTIONS);

/**
 * Throw a usage error in the form commander itself emits for misuse.
 *
 * `formatMmeError` translates these into exit code `2` (Usage). Centralising
 * the throw means every validation failure routes through the same exit-code
 * pipeline as `--unknown-flag`.
 *
 * @param message - User-facing error message.
 * @returns Never; always throws.
 */
const usageError = (message: string): never => {
  throw new CommanderError(2, "mme.usageError", message);
};

/**
 * Parse a comma-separated list into a typed `TrackSection[]`.
 *
 * Empty entries (`"a,,b"`) are dropped; unknown entries raise a usage error
 * naming both the flag (`--include` / `--exclude`) and the offending value.
 *
 * @param raw - Raw comma-separated string from commander.
 * @param flag - Flag name, used in the error message.
 * @returns A frozen array of recognised sections.
 */
const parseSections = (raw: string, flag: string): readonly TrackSection[] => {
  const parts = raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  const invalid = parts.find((value) => !TRACK_SECTION_SET.has(value));
  if (invalid !== undefined) {
    return usageError(
      `${flag}: unknown section "${invalid}" (allowed: ${TRACK_SECTIONS.join(", ")})`,
    );
  }

  return parts as readonly TrackSection[];
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
 * Resolve the input source from the file argument and `--stdin` / `--format`.
 *
 * @param file - Optional positional file argument.
 * @param opts - Raw commander options.
 * @returns A discriminated `ReadSource`.
 */
const resolveSource = (file: string | undefined, opts: ReadCliRawOptions): ReadSource => {
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
    return usageError("`mme read` requires either a `<file>` argument or `--stdin`");
  }

  return { kind: "file", path: file };
};

/**
 * Resolve the output mode from `--pretty` / `--field`.
 *
 * @param opts - Raw commander options.
 * @returns The selected {@link ReadOutputMode}.
 */
const resolveOutputMode = (opts: ReadCliRawOptions): ReadOutputMode => {
  if (opts.pretty === true && opts.field !== undefined) {
    return usageError("`--pretty` and `--field` are mutually exclusive");
  }

  if (opts.pretty === true) {
    return "pretty";
  }

  if (opts.field !== undefined) {
    return "field";
  }

  return "json";
};

/**
 * Resolve include / exclude sections, enforcing mutual exclusion.
 *
 * @param opts - Raw commander options.
 * @returns A pair (`include`, `exclude`). At most one is non-`undefined`.
 */
const resolveSections = (
  opts: ReadCliRawOptions,
): { include?: readonly TrackSection[]; exclude?: readonly TrackSection[] } => {
  if (opts.include !== undefined && opts.exclude !== undefined) {
    return usageError("`--include` and `--exclude` are mutually exclusive");
  }

  if (opts.include !== undefined) {
    return { include: parseSections(opts.include, "--include") };
  }

  if (opts.exclude !== undefined) {
    return { exclude: parseSections(opts.exclude, "--exclude") };
  }

  return {};
};

/**
 * Translate commander's raw output into a validated {@link ReadCommandOptions}.
 *
 * All mutually exclusive combinations and unknown enum values raise a
 * {@link CommanderError} (`exitCode = 2`); `formatMmeError` then translates
 * that into the documented Usage exit code.
 *
 * @returns The validated read-command options.
 */
export const parseReadOptions = ({ file, opts }: Args): ReadCommandOptions => {
  const source = resolveSource(file, opts);
  const outputMode = resolveOutputMode(opts);
  const sections = resolveSections(opts);
  const noWarnings = opts.warnings === false;

  return {
    source,
    outputMode,
    ...(opts.field === undefined ? {} : { field: opts.field }),
    ...sections,
    noWarnings,
  };
};
